import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createGlotAuth } from '@glot/auth'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { hashText } from '@glot/utils/hash'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { GithubGitReader } from '../server/domains/catalogs/services/github-git-reader.service.ts'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'
import { ReleaseJobsService } from '../server/domains/releases/services/release-jobs.service.ts'
import { ReleaseRunnerService } from '../server/domains/releases/services/release-runner.service.ts'
import { GITHUB_RELEASE } from './fixtures/github-release.fixtures.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const LOCALES = 'packages/translations/i18n/locales'
const PL = `${LOCALES}/pl.json`
const FR = `${LOCALES}/fr.json`
const PL_REVIEWS = '.glot/reviews/pl.jsonl'

const PEOPLE = [
  { id: 'user-rel-olga', name: 'Olga', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-rel-dave', name: 'Dave', role: WORKSPACE_ROLES.DEVELOPER, languages: null },
  { id: 'user-rel-paul', name: 'Paul', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'user-rel-lena', name: 'Lena', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'user-rel-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
let projectId = ''
let repository = ''
let formatProjectId = ''
let formatRepository = ''
let jamProjectId = ''
let jamRepository = ''
let seeded = { pl: '', fr: '', main: '' }
let developerKey = ''

function as(name: string) {
  const client = clients.get(name)

  if (!client) throw new Error(`${name} is not signed in`)

  return client
}

async function git(options: { directory: string; args: string[] }) {
  const { stdout } = await run('git', ['-C', options.directory, ...options.args])

  return stdout
}

async function show(options: { directory: string; path: string; ref: string }) {
  return git({ directory: options.directory, args: ['show', `${options.ref}:${options.path}`] })
}

async function commitUpstream(options: {
  directory: string
  path: string
  edit: (content: string) => string
}) {
  const file = join(options.directory, options.path)

  await writeFile(file, options.edit(await readFile(file, 'utf8')))

  await git({
    directory: options.directory,
    args: [
      '-c',
      'user.name=Dev',
      '-c',
      'user.email=dev@glot.test',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--all',
      '--message',
      `Change ${options.path}`,
    ],
  })
}

async function textBySource(options: { name: string; project: string; source: string }) {
  const page = await as(options.name).texts.search({
    projectId: options.project,
    q: options.source,
  })

  const text = page.items.find((item) => item.source.value === options.source)

  if (!text) throw new Error(`No text reads ${options.source}`)

  return text
}

function translationOf(options: {
  text: Awaited<ReturnType<typeof textBySource>>
  language: string
}) {
  const found = options.text.translations.find((item) => item.language === options.language)

  if (!found) throw new Error(`No ${options.language} translation`)

  return found
}

async function approveDraft(options: { project: string; source: string; value: string }) {
  const text = await textBySource({
    name: 'Paul',
    project: options.project,
    source: options.source,
  })

  const draft = await as('Paul').drafts.save({
    projectId: options.project,
    textId: text.id,
    language: 'pl',
    value: options.value,
  })

  await as('Paul').drafts.send({ projectId: options.project, draftId: draft.id })

  await as('Lena').reviews.approve({
    projectId: options.project,
    textId: text.id,
    language: 'pl',
    draftId: draft.id,
  })

  return { text, draft }
}

async function mergeReleaseBranch(directory: string) {
  await git({ directory, args: ['merge', '--ff-only', 'glot/release'] })
}

async function reviewLines(options: { directory: string; ref: string }) {
  const content = await show({ directory: options.directory, path: PL_REVIEWS, ref: options.ref })

  return content
    .trim()
    .split('\n')
    .map((line): unknown => JSON.parse(line))
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Release', slug: 'release' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@release.test`,
        emailVerified: true,
      },
    })

    await connection.db.workspaceMemberships.create({
      data: {
        workspaceId: workspace.id,
        userId: person.id,
        role: person.role,
        languages: person.languages,
      },
    })
  }

  const project = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: 'glot/release-train',
  })

  const formatProject = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: 'glot/release-format',
  })

  const jamProject = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: 'glot/release-jam',
  })

  const auth = createGlotAuth({
    baseURL: baseUrl,
    database: connection.drizzle,
    secret: 'glot-release-test-secret-at-least-32-characters',
    trustedOrigins: [baseUrl],
  })

  developerKey = (
    await auth.api.createApiKey({ body: { userId: 'user-rel-dave', name: 'Release agent' } })
  ).key

  await connection.close()
  projectId = project.id
  formatProjectId = formatProject.id
  jamProjectId = jamProject.id

  repository = (
    await seedDemoRepository({ root: inject('repositoriesRoot'), repository: 'glot/release-train' })
  ).directory

  formatRepository = (
    await seedDemoRepository({
      root: inject('repositoriesRoot'),
      repository: 'glot/release-format',
    })
  ).directory

  jamRepository = (
    await seedDemoRepository({ root: inject('repositoriesRoot'), repository: 'glot/release-jam' })
  ).directory

  seeded = {
    pl: await readFile(join(repository, PL), 'utf8'),
    fr: await readFile(join(repository, FR), 'utf8'),
    main: (await git({ directory: repository, args: ['rev-parse', 'main'] })).trim(),
  }

  for (const person of PEOPLE) {
    const cookie = await signInByMagicLink(`${person.name.toLowerCase()}@release.test`)

    clients.set(person.name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }
})

test('with nothing approved there is nothing to release', async () => {
  await expect(as('Olga').releases.next({ projectId })).resolves.toMatchObject({
    open: null,
    ready: { changes: 0, approvals: 0 },
    conflicts: 0,
  })

  await expect(as('Olga').releases.run({ projectId })).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'There is nothing to release',
  })
})

test('approved drafts and approvals make one commit on the release branch, untouched lines byte for byte', async () => {
  const { text: save } = await approveDraft({
    project: projectId,
    source: 'Enregistrer',
    value: 'Zapisz',
  })

  const remove = await textBySource({ name: 'Lena', project: projectId, source: 'Supprimer' })

  await as('Lena').reviews.editAndApprove({
    projectId,
    textId: remove.id,
    language: 'pl',
    value: 'Usuń',
  })

  const outbid = await textBySource({
    name: 'Lena',
    project: projectId,
    source: 'Enchère dépassée',
  })

  await as('Lena').reviews.approve({ projectId, textId: outbid.id, language: 'pl' })

  await expect(as('Vic').releases.next({ projectId })).resolves.toMatchObject({
    open: null,
    ready: { changes: 2, approvals: 3 },
    conflicts: 0,
  })

  const release = await as('Dave').releases.run({ projectId })

  expect(release).toMatchObject({
    status: 'OPEN',
    trigger: 'MANUAL',
    startedByName: 'Dave',
    changes: 2,
    approvals: 3,
    pullRequestNumber: null,
  })

  expect(
    (
      await git({ directory: repository, args: ['rev-list', '--count', 'main..glot/release'] })
    ).trim(),
  ).toBe('1')

  expect((await git({ directory: repository, args: ['rev-parse', 'glot/release^'] })).trim()).toBe(
    seeded.main,
  )

  expect(
    (
      await git({ directory: repository, args: ['diff', '--numstat', 'main', 'glot/release'] })
    ).trim(),
  ).toBe(`3\t0\t${PL_REVIEWS}\n2\t2\t${PL}`)

  expect(await show({ directory: repository, path: PL, ref: 'glot/release' })).toBe(
    seeded.pl.replace('"Ratować"', '"Zapisz"').replace('"USUWAĆ"', '"Usuń"'),
  )

  expect(await reviewLines({ directory: repository, ref: 'glot/release' })).toEqual([
    {
      key: { source: 'shared-base', path: ['actions', 'save'] },
      sourceHash: hashText('Enregistrer'),
      targetHash: hashText('Zapisz'),
      reviewedBy: 'user-rel-lena',
    },
    {
      key: { source: 'shared-base', path: ['actions', 'delete'] },
      sourceHash: hashText('Supprimer'),
      targetHash: hashText('Usuń'),
      reviewedBy: 'user-rel-lena',
      selfApproved: true,
    },
    {
      key: { source: 'shared-base', path: ['marketplace', 'itemCard', 'outbid'] },
      sourceHash: hashText('Enchère dépassée'),
      targetHash: hashText('Oferta przebita'),
      reviewedBy: 'user-rel-lena',
    },
  ])

  expect((await git({ directory: repository, args: ['status', '--porcelain'] })).trim()).toBe('')
  expect((await git({ directory: repository, args: ['rev-parse', 'main'] })).trim()).toBe(
    seeded.main,
  )

  const again = await as('Olga').releases.run({ projectId })

  expect(again.id).toBe(release.id)
  expect(again.commit).toBe(release.commit)

  expect((await git({ directory: repository, args: ['rev-parse', 'glot/release'] })).trim()).toBe(
    release.commit,
  )

  await expect(as('Vic').releases.next({ projectId })).resolves.toMatchObject({
    open: { id: release.id, status: 'OPEN', startedByName: 'Dave' },
  })

  expect(save.id).toBeTruthy()
})

test('only owners, admins and developers release, and a key never does, even a developer’s', async () => {
  for (const name of ['Paul', 'Lena', 'Vic']) {
    await expect(as(name).releases.run({ projectId })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  }

  const agent = createGlotClient({ url: baseUrl, token: developerKey })

  await expect(agent.releases.run({ projectId })).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(
    agent.releases.undo({ projectId, releaseId: projectId, changeId: projectId }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(
    agent.releases.resolveConflict({ projectId, draftId: projectId, resolution: 'KEEP' }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  const spec = await fetch(`${baseUrl}/api/v1/openapi.json`).then((response) => response.json())

  expect(Object.keys(spec.paths)).toEqual(
    expect.arrayContaining([
      '/projects/{projectId}/releases/next',
      '/projects/{projectId}/releases/{releaseId}/changes/{changeId}/undo',
      '/projects/{projectId}/conflicts/{draftId}',
    ]),
  )

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${developerKey}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  })

  const names: string[] = (await response.json()).result.tools.map(
    (tool: { name: string }) => tool.name,
  )

  expect(names).toEqual(
    expect.arrayContaining([
      'getNextRelease',
      'listReleases',
      'listReleaseChanges',
      'listConflicts',
    ]),
  )

  for (const deciding of ['releaseNow', 'undoReleasedChange', 'resolveConflict']) {
    expect(names).not.toContain(deciding)
  }
})

test('a merged release leaves the open state, shows in the history and its texts read reviewed', async () => {
  await mergeReleaseBranch(repository)
  await as('Dave').projects.sync({ projectId })

  const next = await as('Dave').releases.next({ projectId })

  expect(next).toMatchObject({ open: null, ready: { changes: 0, approvals: 0 }, conflicts: 0 })

  const history = await as('Vic').releases.history({ projectId })

  expect(history.total).toBe(1)
  expect(history.items[0]).toMatchObject({ status: 'MERGED', changes: 2, approvals: 3 })

  const changes = await as('Vic').releases.changes({
    projectId,
    releaseId: history.items[0]?.id ?? '',
  })

  expect(
    changes.items
      .map(({ previousValue, value, authorName, undone }) => ({
        previousValue,
        value,
        authorName,
        undone,
      }))
      .toSorted((a, b) => a.value.localeCompare(b.value)),
  ).toEqual([
    { previousValue: 'USUWAĆ', value: 'Usuń', authorName: 'Lena', undone: false },
    { previousValue: 'Ratować', value: 'Zapisz', authorName: 'Paul', undone: false },
  ])

  const save = await textBySource({ name: 'Vic', project: projectId, source: 'Enregistrer' })

  expect(translationOf({ text: save, language: 'pl' })).toMatchObject({
    value: 'Zapisz',
    state: 'REVIEWED',
    reviewedBy: 'user-rel-lena',
    selfApproved: false,
    draft: null,
  })

  const remove = await textBySource({ name: 'Vic', project: projectId, source: 'Supprimer' })

  expect(translationOf({ text: remove, language: 'pl' })).toMatchObject({
    value: 'Usuń',
    state: 'REVIEWED',
    selfApproved: true,
  })
})

test('undo is a new change that restores the previous text on the next release', async () => {
  const history = await as('Dave').releases.history({ projectId })
  const release = history.items[0]

  const changes = await as('Dave').releases.changes({ projectId, releaseId: release?.id ?? '' })
  const zapisz = changes.items.find(({ value }) => value === 'Zapisz')

  if (!zapisz) throw new Error('The release did not write Zapisz')

  const input = { projectId, releaseId: release?.id ?? '', changeId: zapisz.id }

  await expect(as('Paul').releases.undo(input)).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(as('Dave').releases.undo(input)).resolves.toMatchObject({
    id: zapisz.id,
    undone: true,
  })

  await expect(as('Dave').releases.undo(input)).rejects.toMatchObject({ code: 'CONFLICT' })

  const save = await textBySource({ name: 'Vic', project: projectId, source: 'Enregistrer' })

  expect(translationOf({ text: save, language: 'pl' })).toMatchObject({ value: 'Ratować' })

  await expect(as('Dave').releases.next({ projectId })).resolves.toMatchObject({
    ready: { changes: 1, approvals: 0 },
  })

  const undoRelease = await as('Dave').releases.run({ projectId })

  expect(undoRelease).toMatchObject({ status: 'OPEN', changes: 1, approvals: 0 })

  await expect(
    as('Dave').releases.undo({ ...input, releaseId: undoRelease.id }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await mergeReleaseBranch(repository)
  await as('Dave').projects.sync({ projectId })

  expect(await readFile(join(repository, PL), 'utf8')).toBe(seeded.pl.replace('"USUWAĆ"', '"Usuń"'))

  const restored = await textBySource({ name: 'Vic', project: projectId, source: 'Enregistrer' })

  expect(translationOf({ text: restored, language: 'pl' })).toMatchObject({
    value: 'Ratować',
    state: 'TO_CHECK',
  })

  expect((await as('Dave').releases.history({ projectId })).total).toBe(2)
})

test('a draft whose French changed upstream becomes a conflict its author keeps or leaves out', async () => {
  const { draft } = await approveDraft({
    project: projectId,
    source: 'Ce lot est vendu aux enchères.',
    value: 'Ten przedmiot jest sprzedawany na aukcji.',
  })

  await commitUpstream({
    directory: repository,
    path: FR,
    edit: (content) =>
      content.replace('Ce lot est vendu aux enchères.', 'Ce lot est mis aux enchères.'),
  })

  await as('Dave').projects.sync({ projectId })

  await expect(as('Dave').releases.next({ projectId })).resolves.toMatchObject({
    ready: { changes: 0, approvals: 0 },
    conflicts: 1,
  })

  const conflicts = await as('Paul').releases.conflicts({ projectId })

  expect(conflicts.total).toBe(1)

  expect(conflicts.items[0]).toMatchObject({
    reason: 'SOURCE_CHANGED',
    source: 'Ce lot est mis aux enchères.',
    current: null,
    draft: { id: draft.id, value: 'Ten przedmiot jest sprzedawany na aukcji.', status: 'CONFLICT' },
  })

  await expect(as('Lena').releases.conflicts({ projectId })).resolves.toMatchObject({ total: 1 })
  await expect(as('Vic').releases.conflicts({ projectId })).resolves.toMatchObject({ total: 0 })

  await expect(as('Dave').releases.run({ projectId })).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'There is nothing to release',
  })

  const held = await textBySource({
    name: 'Vic',
    project: projectId,
    source: 'Ce lot est mis aux enchères.',
  })

  expect(translationOf({ text: held, language: 'pl' })).toMatchObject({
    value: null,
    state: 'MISSING',
  })

  const decision = { projectId, draftId: draft.id, resolution: 'KEEP' } as const

  await expect(as('Vic').releases.resolveConflict(decision)).rejects.toMatchObject({
    code: 'FORBIDDEN',
  })

  await expect(as('Paul').releases.resolveConflict(decision)).resolves.toMatchObject({
    id: draft.id,
    status: 'IN_REVIEW',
  })

  const queue = await as('Lena').reviews.queue({ projectId, language: 'pl' })

  expect(queue.items.find((item) => item.draft?.id === draft.id)).toMatchObject({
    reason: 'SENT_FOR_REVIEW',
  })

  await as('Lena').reviews.approve({
    projectId,
    textId: held.id,
    language: 'pl',
    draftId: draft.id,
  })

  await expect(as('Dave').releases.next({ projectId })).resolves.toMatchObject({
    ready: { changes: 1, approvals: 1 },
    conflicts: 0,
  })

  await expect(as('Dave').releases.run({ projectId })).resolves.toMatchObject({
    changes: 1,
    approvals: 1,
  })

  const lines = await reviewLines({ directory: repository, ref: 'glot/release' })

  expect(lines).toContainEqual({
    key: { source: 'shared-base', path: ['marketplace', 'lotDescription'] },
    sourceHash: hashText('Ce lot est mis aux enchères.'),
    targetHash: hashText('Ten przedmiot jest sprzedawany na aukcji.'),
    reviewedBy: 'user-rel-lena',
  })

  await mergeReleaseBranch(repository)
  await as('Dave').projects.sync({ projectId })

  const shipped = await textBySource({
    name: 'Vic',
    project: projectId,
    source: 'Ce lot est mis aux enchères.',
  })

  expect(translationOf({ text: shipped, language: 'pl' })).toMatchObject({
    value: 'Ten przedmiot jest sprzedawany na aukcji.',
    state: 'REVIEWED',
  })
})

test('a text changed upstream in the same language is a conflict that can be left out', async () => {
  const { draft } = await approveDraft({
    project: projectId,
    source: 'Fin le {date}',
    value: 'Koniec {date}',
  })

  await commitUpstream({
    directory: repository,
    path: PL,
    edit: (content) => content.replace('"Koniec {data}"', '"Kończy się {date}"'),
  })

  await as('Dave').projects.sync({ projectId })

  const conflicts = await as('Lena').releases.conflicts({ projectId })

  expect(conflicts.items).toMatchObject([
    { reason: 'TARGET_CHANGED', current: 'Kończy się {date}', draft: { id: draft.id } },
  ])

  await expect(
    as('Paul').releases.resolveConflict({ projectId, draftId: draft.id, resolution: 'LEAVE_OUT' }),
  ).resolves.toMatchObject({ id: draft.id, status: 'WITHDRAWN' })

  await expect(as('Dave').releases.next({ projectId })).resolves.toMatchObject({
    ready: { changes: 0 },
    conflicts: 0,
  })

  const text = await textBySource({ name: 'Vic', project: projectId, source: 'Fin le {date}' })

  expect(translationOf({ text, language: 'pl' })).toMatchObject({ value: 'Kończy się {date}' })
})

test('keeping a conflict withdraws the other approved change to the same text, so the release goes through', async () => {
  const projectId = jamProjectId
  const { draft } = await approveDraft({ project: projectId, source: 'Supprimer', value: 'Usuń' })

  await commitUpstream({
    directory: jamRepository,
    path: PL,
    edit: (content) => content.replace('"USUWAĆ"', '"Kasuj"'),
  })

  await as('Dave').projects.sync({ projectId })

  await expect(as('Dave').releases.next({ projectId })).resolves.toMatchObject({ conflicts: 1 })

  const remove = await textBySource({ name: 'Lena', project: projectId, source: 'Supprimer' })

  await as('Lena').reviews.editAndApprove({
    projectId,
    textId: remove.id,
    language: 'pl',
    value: 'Skasuj',
  })

  await expect(
    as('Paul').releases.resolveConflict({ projectId, draftId: draft.id, resolution: 'KEEP' }),
  ).resolves.toMatchObject({ id: draft.id, status: 'APPROVED' })

  const release = await as('Dave').releases.run({ projectId })

  expect(release).toMatchObject({ status: 'OPEN', changes: 1 })

  const changes = await as('Dave').releases.changes({ projectId, releaseId: release.id })

  expect(changes.items.map(({ value }) => value)).toEqual(['Usuń'])
  expect(await show({ directory: jamRepository, path: PL, ref: 'glot/release' })).toContain('Usuń')
})

test('values are replaced and added in place in a file with its own formatting', async () => {
  const original = [
    '﻿{',
    '\t"actions" : {',
    '\t\t"delete":"USUWAĆ" ,',
    '\t\t"save"   :   "Ratować"',
    '\t},',
    '\t"marketplace": {',
    '\t\t"itemCard": {',
    '\t\t\t"outbid": "Oferta przebita"',
    '\t\t}',
    '\t}',
    '}',
    '',
  ].join('\r\n')

  await commitUpstream({
    directory: formatRepository,
    path: PL,
    edit: () => original,
  })

  await as('Dave').projects.sync({ projectId: formatProjectId })

  await approveDraft({ project: formatProjectId, source: 'Enregistrer', value: 'Zapisz "teraz"' })

  await approveDraft({
    project: formatProjectId,
    source: 'Ce lot est vendu aux enchères.',
    value: 'Ten przedmiot jest na aukcji.',
  })

  await as('Dave').releases.run({ projectId: formatProjectId })

  const written = await show({ directory: formatRepository, path: PL, ref: 'glot/release' })

  const inserted = ',\r\n\t\t"lotDescription": "Ten przedmiot jest na aukcji."'

  expect(written.replace(inserted, '')).toBe(original.replace('"Ratować"', '"Zapisz \\"teraz\\""'))

  expect(written).toContain(inserted)
  expect(written.startsWith('﻿{\r\n')).toBe(true)
  expect(written.replaceAll('\r\n', '')).not.toContain('\n')
})

test('the GitHub adapter publishes with the refs, commits and pulls API', async () => {
  function replayOf(exchanges: typeof GITHUB_RELEASE.firstRelease) {
    const pending = [...exchanges]

    const replay: typeof fetch = async (input, init) => {
      const expected = pending.shift()
      const url = new URL(input instanceof Request ? input.url : input).toString()

      if (!expected) throw new Error(`Unexpected ${init?.method} ${url}`)

      expect({ method: init?.method, url }).toEqual({ method: expected.method, url: expected.url })

      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer ghp_recorded')
      expect(typeof init?.body === 'string' ? JSON.parse(init.body) : undefined).toEqual(
        'body' in expected ? expected.body : undefined,
      )

      return new Response(JSON.stringify(expected.response), { status: expected.status })
    }

    return { replay, pending }
  }

  const publication = {
    repository: 'acme/app',
    branch: 'glot/release',
    base: { branch: 'main', commit: GITHUB_RELEASE.base },
    message: GITHUB_RELEASE.message,
    files: GITHUB_RELEASE.files,
    pullRequest: GITHUB_RELEASE.pullRequest,
  }

  for (const exchanges of [GITHUB_RELEASE.firstRelease, GITHUB_RELEASE.nextRelease]) {
    const { replay, pending } = replayOf(exchanges)

    const published = await new GithubGitReader({ token: 'ghp_recorded', fetch: replay }).publish(
      publication,
    )

    expect(published).toEqual({
      commit: GITHUB_RELEASE.commit,
      pullRequest: { number: 42, url: GITHUB_RELEASE.pullRequestUrl },
    })

    expect(pending).toHaveLength(0)
  }

  await expect(new GithubGitReader({}).publish(publication)).rejects.toThrow(
    'Releasing needs a GitHub token',
  )
})

test('the twice-a-day clock releases once per slot and a second tick changes nothing', async () => {
  const adminUrl = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
  const name = `glot_clock_${process.pid}`
  const admin = new Client({ connectionString: adminUrl })

  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${name}`)

  const root = await mkdtemp(join(tmpdir(), 'glot-clock-'))
  const connection = createDatabase({ connectionString: adminUrl.replace(/\/glot$/u, `/${name}`) })

  try {
    await migrate(connection.drizzle, {
      migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
    })

    const { db } = connection
    const workspace = await db.workspaces.create({ data: { name: 'Clock', slug: 'clock' } })

    const user = await db.user.create({
      data: { id: 'user-clock', name: 'Clock', email: 'clock@clock.test', emailVerified: true },
    })

    const project = await seedDemoProject(db, {
      workspaceId: workspace.id,
      repository: 'glot/clock',
    })

    const { directory } = await seedDemoRepository({ root, repository: 'glot/clock' })
    const reader = new LocalGitReader({ root })
    const catalog = new CatalogService({ reader })
    const sources = await db.projectSources.findMany({ where: { projectId: project.id } })
    const full = { ...project, sources }
    const { entries } = await catalog.read(full)
    const save = entries.find(({ sourceValue }) => sourceValue === 'Enregistrer')

    if (!save) throw new Error('The seeded repository has no Enregistrer')

    await db.drafts.create({
      data: {
        projectId: project.id,
        textId: save.id,
        language: 'pl',
        value: 'Zapisz',
        authorId: user.id,
        status: 'APPROVED',
        ...(await catalog.base({ project: full, textId: save.id, language: 'pl' })),
      },
    })

    await db.approvals.create({
      data: {
        projectId: project.id,
        textId: save.id,
        language: 'pl',
        sourceHash: save.sourceHash,
        targetHash: hashText('Zapisz'),
        reviewerId: user.id,
      },
    })

    const jobs = new ReleaseJobsService({
      db,
      runner: new ReleaseRunnerService({ db, catalog, git: reader }),
    })

    await jobs.tick({ now: new Date(Date.UTC(2026, 10, 30, 9, 0)) })

    const branch = async () =>
      (await git({ directory, args: ['rev-parse', 'glot/release'] })).trim()

    const first = await branch()

    expect(
      (await db.jobs.findMany({ orderBy: { runAt: 'asc' } })).map(({ runAt, status }) => ({
        hour: runAt.getUTCHours(),
        status,
      })),
    ).toEqual([
      { hour: 8, status: 'DONE' },
      { hour: 14, status: 'PENDING' },
    ])

    const release = await db.releases.findFirst({ where: { projectId: project.id } })

    expect(release).toMatchObject({
      status: 'OPEN',
      trigger: 'SCHEDULED',
      startedById: null,
      commit: first,
      changeCount: 1,
      approvalCount: 1,
    })

    expect(
      (await git({ directory, args: ['rev-list', '--count', 'main..glot/release'] })).trim(),
    ).toBe('1')

    await jobs.tick({ now: new Date(Date.UTC(2026, 10, 30, 9, 0)) })
    await jobs.tick({ now: new Date(Date.UTC(2026, 10, 30, 15, 0)) })

    expect(await branch()).toBe(first)
    expect(await db.releases.count({ where: { projectId: project.id } })).toBe(1)

    expect((await db.jobs.findMany()).map(({ status }) => status)).toEqual(['DONE', 'DONE'])
  } finally {
    await connection.close()
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await admin.end()
    await rm(root, { recursive: true, force: true })
  }
})
