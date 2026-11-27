import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ACTOR_KINDS, createGlotAuth, createSmtpMailer } from '@glot/auth'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { JOB_KINDS, JOB_STATUSES } from '@glot/database/constants/jobs'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { approvals } from '@glot/database/schemas/approvals'
import { drafts } from '@glot/database/schemas/drafts'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { hashText } from '@glot/utils/hash'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { afterAll, beforeAll, expect, inject, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'
import { DigestJobsService } from '../server/domains/digests/services/digest-jobs.service.ts'
import { HomeService } from '../server/domains/home/services/home.service.ts'
import { dropDatabase } from './support/database.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'
import { testAiRuntime } from './support/ai-runtime.ts'
import { startSmtpSink } from './support/smtp.ts'
import type { Database } from '@glot/database'
import type { DraftStatus } from '@glot/database/types/drafts'
import type { WorkspaceRole } from '@glot/database/types/workspaces'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const APP_URL = 'https://glot.example.test'
const AUTH_SECRET = 'glot-digest-test-secret-at-least-32-characters'
const TARGET_LANGUAGES = ['de', 'en', 'nl', 'pl']

const HOME_PEOPLE = [
  { id: 'user-home-olga', name: 'Olga', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-home-lena', name: 'Lena', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'user-home-paul', name: 'Paul', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'user-home-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
]

const REPORT_PEOPLE = [
  { id: 'user-rep-rita', name: 'Rita', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-rep-wes', name: 'Wes', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'user-rep-rex', name: 'Rex', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
let homeWorkspaceId = ''
let homeProjectId = ''
let homeRepository = ''
let reportWorkspaceId = ''
let reportProjectId = ''
let agentKey = ''
let digest: Awaited<ReturnType<typeof createDigestFixture>> | undefined

function as(name: string) {
  const client = clients.get(name)

  if (!client) throw new Error(`${name} is not signed in`)

  return client
}

async function addPeople(options: {
  db: Database
  workspaceId: string
  people: Array<{ id: string; name: string; role: WorkspaceRole; languages: string[] | null }>
  domain: string
}) {
  for (const person of options.people) {
    await options.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.id.split('-').at(-1)}@${options.domain}`,
        emailVerified: true,
      },
    })

    await options.db.workspaceMemberships.create({
      data: {
        workspaceId: options.workspaceId,
        userId: person.id,
        role: person.role,
        languages: person.languages,
      },
    })
  }
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

async function fixCount(options: { name: string; language: string }) {
  const page = await as(options.name).texts.search({
    projectId: homeProjectId,
    state: TEXT_STATES.NEEDS_FIX,
    language: options.language,
    limit: 200,
  })

  return page.total
}

async function stateCount(options: { language: string; state: keyof typeof TEXT_STATES }) {
  const page = await as('Olga').texts.search({
    projectId: homeProjectId,
    state: options.state,
    language: options.language,
    limit: 1,
  })

  return page.total
}

async function saveAndSend(options: {
  name: string
  project: string
  source: string
  value: string
}) {
  const text = await textBySource(options)

  const draft = await as(options.name).drafts.save({
    projectId: options.project,
    textId: text.id,
    language: 'pl',
    value: options.value,
  })

  await as(options.name).drafts.send({ projectId: options.project, draftId: draft.id })

  return { text, draft }
}

async function createDigestFixture() {
  const name = `glot_digest_${process.pid}`
  const admin = new Client({ connectionString: ADMIN_URL })

  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${name}`)

  const root = await mkdtemp(join(tmpdir(), 'glot-digest-'))
  const connection = createDatabase({ connectionString: ADMIN_URL.replace(/\/glot$/u, `/${name}`) })

  await migrate(connection.drizzle, {
    migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
  })

  const { db } = connection
  const workspace = await db.workspaces.create({ data: { name: 'Digest', slug: 'digest' } })

  const people = [
    { id: 'user-dig-lena', name: 'Léna & Co', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
    { id: 'user-dig-rob', name: 'Rob', role: WORKSPACE_ROLES.REVIEWER, languages: ['de'] },
    { id: 'user-dig-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
    { id: 'user-dig-ivy', name: 'Ivy', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  ]

  await addPeople({ db, workspaceId: workspace.id, people, domain: 'digest.test' })
  await db.user.update({ where: { id: 'user-dig-rob' }, data: { receivesDigest: false } })
  await db.user.update({ where: { id: 'user-dig-ivy' }, data: { emailVerified: false } })

  const project = await seedDemoProject(db, {
    workspaceId: workspace.id,
    repository: 'glot/digest',
  })

  await seedDemoRepository({ root, repository: 'glot/digest' })

  const auth = createGlotAuth({
    baseURL: APP_URL,
    database: connection.drizzle,
    secret: AUTH_SECRET,
    trustedOrigins: [APP_URL],
  })

  const reader = new LocalGitReader({ root })
  const catalog = new CatalogService({ reader })
  const sink = await startSmtpSink()

  const context = {
    auth,
    db,
    catalog,
    git: reader,
    ai: testAiRuntime({ secret: AUTH_SECRET, baseUrl: 'http://127.0.0.1:1' }),
  }

  return {
    db,
    sink,
    projectId: project.id,
    workspaceId: workspace.id,
    context,
    service: new DigestJobsService({
      context,
      send: createSmtpMailer({ url: sink.url, from: 'Glot <glot@digest.test>' }),
      appUrl: APP_URL,
    }),
    failing: new DigestJobsService({
      context,
      send: createSmtpMailer({ url: 'smtp://127.0.0.1:1', from: 'Glot <glot@digest.test>' }),
      appUrl: APP_URL,
    }),
    async close() {
      await sink.close()
      await connection.close()
      await dropDatabase({ admin, name })
      await admin.end()
      await rm(root, { recursive: true, force: true })
    },
  }
}

function fixture() {
  if (!digest) throw new Error('The digest fixture is not ready')

  return digest
}

async function digestJobs() {
  return (await fixture().db.jobs.findMany({ where: { kind: JOB_KINDS.DIGEST } }))
    .map(({ userId, runAt, status }) => ({ userId, day: runAt.toISOString().slice(0, 10), status }))
    .toSorted((a, b) => `${a.day}${a.userId}`.localeCompare(`${b.day}${b.userId}`))
}

async function git(options: { directory: string; args: string[] }) {
  const { stdout } = await run('git', ['-C', options.directory, ...options.args])

  return stdout
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })
  const { db } = connection

  const home = await db.workspaces.create({ data: { name: 'Home', slug: 'home-overview' } })
  const reports = await db.workspaces.create({ data: { name: 'Reports', slug: 'home-reports' } })

  await addPeople({ db, workspaceId: home.id, people: HOME_PEOPLE, domain: 'home.test' })
  await addPeople({ db, workspaceId: reports.id, people: REPORT_PEOPLE, domain: 'reports.test' })

  await db.user.create({
    data: { id: 'user-home-eve', name: 'Eve', email: 'eve@home.test', emailVerified: true },
  })

  const homeProject = await seedDemoProject(db, {
    workspaceId: home.id,
    repository: 'glot/home-overview',
  })

  const reportProject = await seedDemoProject(db, {
    workspaceId: reports.id,
    repository: 'glot/home-reports',
  })

  const auth = createGlotAuth({
    baseURL: baseUrl,
    database: connection.drizzle,
    secret: 'glot-home-test-secret-at-least-32-characters',
    trustedOrigins: [baseUrl],
  })

  agentKey = (await auth.api.createApiKey({ body: { userId: 'user-home-olga', name: 'Home' } })).key

  await connection.close()
  homeWorkspaceId = home.id
  homeProjectId = homeProject.id
  reportWorkspaceId = reports.id
  reportProjectId = reportProject.id

  homeRepository = (
    await seedDemoRepository({
      root: inject('repositoriesRoot'),
      repository: 'glot/home-overview',
    })
  ).directory

  await seedDemoRepository({ root: inject('repositoriesRoot'), repository: 'glot/home-reports' })

  for (const name of [
    ...HOME_PEOPLE.map((person) => person.name),
    ...REPORT_PEOPLE.map((person) => person.name),
  ]) {
    const domain = REPORT_PEOPLE.some((person) => person.name === name) ? 'reports' : 'home'
    const cookie = await signInByMagicLink(`${name.toLowerCase()}@${domain}.test`)

    clients.set(name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }

  clients.set(
    'Eve',
    createGlotClient({
      url: baseUrl,
      fetch: withCookie(await signInByMagicLink('eve@home.test')),
    }),
  )

  digest = await createDigestFixture()
})

afterAll(async () => {
  await digest?.close()
})

test('a reviewer sees what needs them in their languages, and the numbers agree with texts and the review queue', async () => {
  const overview = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })
  const queue = await as('Lena').reviews.queue({ projectId: homeProjectId, language: 'pl' })
  const fixes = await fixCount({ name: 'Lena', language: 'pl' })

  expect(overview.languages).toEqual({ write: ['pl'], approve: ['pl'] })
  expect(fixes).toBeGreaterThan(0)
  expect(overview.needsYou.fixes.total).toBe(fixes)

  expect(overview.needsYou.fixes.items[0]).toMatchObject({
    projectName: 'Demo apps',
    language: 'pl',
    key: { source: 'shared-base', path: ['marketplace', 'itemCard', 'endedOn'] },
    source: { language: 'fr', value: 'Fin le {date}' },
    value: 'Koniec {data}',
    reason: { code: 'PLACEHOLDERS' },
    shownIn: ['Admin', 'Market'],
  })

  expect(overview.needsYou.reviews).toEqual([
    {
      projectId: homeProjectId,
      projectName: 'Demo apps',
      language: 'pl',
      total: queue.total,
      sentForReview: 0,
    },
  ])

  expect(overview.needsYou.drafts).toEqual({ inProgress: 0, sent: 0, latest: [] })
  expect(overview.needsYou.conflicts).toEqual([])

  expect(overview.needsYou.total).toBe(fixes + queue.total)
  expect(overview.shipped).toEqual([])
})

test('the progress per language is what the texts say, by state', async () => {
  const overview = await as('Vic').home.overview({ workspaceId: homeWorkspaceId })
  const [progress] = overview.progress

  expect(overview.progress).toHaveLength(1)
  expect(progress?.projectName).toBe('Demo apps')
  expect(progress?.languages.map(({ language }) => language)).toEqual(['en', 'de', 'pl', 'nl'])

  for (const language of TARGET_LANGUAGES) {
    const counts = progress?.languages.find((entry) => entry.language === language)?.counts

    for (const state of Object.values(TEXT_STATES)) {
      expect(counts?.[state]).toBe(await stateCount({ language, state }))
    }
  }

  for (const state of Object.values(TEXT_STATES)) {
    expect(progress?.counts[state]).toBe(
      progress?.languages.reduce((sum, entry) => sum + entry.counts[state], 0),
    )
  }
})

test('an owner changes and approves every language, a writer only changes theirs, a viewer has nothing to do', async () => {
  const lena = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })
  const owner = await as('Olga').home.overview({ workspaceId: homeWorkspaceId })
  const writer = await as('Paul').home.overview({ workspaceId: homeWorkspaceId })
  const viewer = await as('Vic').home.overview({ workspaceId: homeWorkspaceId })

  expect(owner.languages).toEqual({ write: TARGET_LANGUAGES, approve: TARGET_LANGUAGES })

  let fixesInEveryLanguage = 0

  for (const language of TARGET_LANGUAGES) {
    fixesInEveryLanguage += await fixCount({ name: 'Olga', language })
  }

  expect(owner.needsYou.fixes.total).toBe(fixesInEveryLanguage)
  expect(owner.needsYou.fixes.total).toBeGreaterThan(lena.needsYou.fixes.total)
  expect(owner.needsYou.reviews.length).toBeGreaterThan(lena.needsYou.reviews.length)
  expect(owner.needsYou.reviews.map(({ language }) => language)).toContain('pl')

  expect(writer.languages).toEqual({ write: ['pl'], approve: [] })
  expect(writer.needsYou.reviews).toEqual([])
  expect(writer.needsYou.fixes.total).toBe(lena.needsYou.fixes.total)

  expect(viewer.languages).toEqual({ write: [], approve: [] })
  expect(viewer.needsYou).toMatchObject({
    total: 0,
    fixes: { total: 0, items: [] },
    reviews: [],
    drafts: { inProgress: 0, sent: 0, latest: [] },
    conflicts: [],
  })

  expect(owner.progress).toEqual(viewer.progress)
})

test('someone outside the workspace has no home in it', async () => {
  await expect(as('Eve').home.overview({ workspaceId: homeWorkspaceId })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })

  await expect(
    as('Eve').reports.monthly({ workspaceId: homeWorkspaceId, month: '2026-11' }),
  ).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('my drafts show as in progress or sent, most recent first, and the reviewer sees what was sent', async () => {
  const progress = await textBySource({
    name: 'Paul',
    project: homeProjectId,
    source: 'Enregistrer',
  })

  await as('Paul').drafts.save({
    projectId: homeProjectId,
    textId: progress.id,
    language: 'pl',
    value: 'Zapisz',
  })

  const before = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })

  await saveAndSend({
    name: 'Paul',
    project: homeProjectId,
    source: 'Supprimer',
    value: 'Usuń',
  })

  const writer = await as('Paul').home.overview({ workspaceId: homeWorkspaceId })
  const reviewer = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })

  expect(writer.needsYou.drafts).toMatchObject({ inProgress: 1, sent: 1 })

  expect(
    writer.needsYou.drafts.latest.map(({ key, language, status }) => [key.path, language, status]),
  ).toEqual([
    [['actions', 'delete'], 'pl', DRAFT_STATUSES.IN_REVIEW],
    [['actions', 'save'], 'pl', DRAFT_STATUSES.DRAFT],
  ])

  expect(writer.needsYou.total).toBe(writer.needsYou.fixes.total + 1)
  expect(reviewer.needsYou.drafts).toEqual({ inProgress: 0, sent: 0, latest: [] })
  expect(reviewer.needsYou.reviews[0]).toMatchObject({ language: 'pl', sentForReview: 1 })
  expect(reviewer.needsYou.reviews[0]?.total).toBe(before.needsYou.reviews[0]?.total)
})

test('a fix, an approved draft and an approval go out with a release that shows as shipped, and the week counts it', async () => {
  const before = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })

  const ended = await textBySource({
    name: 'Lena',
    project: homeProjectId,
    source: 'Fin le {date}',
  })

  const removal = await textBySource({ name: 'Lena', project: homeProjectId, source: 'Supprimer' })
  const sent = removal.translations.find(({ language }) => language === 'pl')?.draft

  if (!sent) throw new Error('Paul’s draft is not in review')

  await as('Lena').reviews.editAndApprove({
    projectId: homeProjectId,
    textId: ended.id,
    language: 'pl',
    value: 'Koniec {date}',
  })

  await as('Lena').reviews.approve({
    projectId: homeProjectId,
    textId: removal.id,
    language: 'pl',
    draftId: sent.id,
  })

  const approved = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })

  expect(approved.needsYou.fixes.total).toBe(before.needsYou.fixes.total - 1)
  expect(approved.needsYou.reviews[0]?.sentForReview).toBe(0)
  expect(approved.week).toEqual({ reviewed: 1, written: 2, shipped: 0 })

  await as('Olga').releases.run({ projectId: homeProjectId })
  await git({ directory: homeRepository, args: ['merge', '--ff-only', 'glot/release'] })
  await as('Olga').projects.sync({ projectId: homeProjectId })

  const shipped = await as('Lena').home.overview({ workspaceId: homeWorkspaceId })

  expect(shipped.shipped).toHaveLength(1)

  expect(shipped.shipped[0]).toMatchObject({
    projectId: homeProjectId,
    projectName: 'Demo apps',
    status: 'MERGED',
    trigger: 'MANUAL',
    startedByName: 'Olga',
    changes: 2,
  })

  expect(shipped.week).toEqual({ reviewed: 1, written: 2, shipped: 1 })
  expect(shipped.needsYou.fixes.total).toBe(approved.needsYou.fixes.total)
})

test('a change held back by a conflict is for its author and for who approves the language', async () => {
  const outbid = await textBySource({
    name: 'Lena',
    project: homeProjectId,
    source: 'Enchère dépassée',
  })

  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  await connection.db.drafts.create({
    data: {
      projectId: homeProjectId,
      textId: outbid.id,
      language: 'pl',
      value: 'Przebita oferta',
      authorId: 'user-home-paul',
      status: DRAFT_STATUSES.APPROVED,
      baseSourceHash: hashText('Un autre texte français'),
      baseTargetHash: hashText('Oferta przebita'),
    },
  })

  await connection.close()

  const conflict = [{ projectId: homeProjectId, projectName: 'Demo apps', total: 1 }]

  for (const name of ['Paul', 'Lena', 'Olga']) {
    const overview = await as(name).home.overview({ workspaceId: homeWorkspaceId })

    expect(overview.needsYou.conflicts).toEqual(conflict)
  }

  const viewer = await as('Vic').home.overview({ workspaceId: homeWorkspaceId })

  expect(viewer.needsYou.conflicts).toEqual([])
  expect(viewer.needsYou.total).toBe(0)
})

test('a person turns the daily email off and on, a key reads the setting but never changes it', async () => {
  await expect(as('Paul').people.preferences()).resolves.toEqual({ receivesDigest: true })

  await expect(as('Paul').people.updatePreferences({ receivesDigest: false })).resolves.toEqual({
    receivesDigest: false,
  })

  await expect(as('Paul').people.preferences()).resolves.toEqual({ receivesDigest: false })
  await expect(as('Lena').people.preferences()).resolves.toEqual({ receivesDigest: true })

  const agent = createGlotClient({ url: baseUrl, token: agentKey })

  await expect(agent.people.preferences()).resolves.toEqual({ receivesDigest: true })

  await expect(agent.people.updatePreferences({ receivesDigest: false })).rejects.toMatchObject({
    code: 'PEOPLE_ONLY',
  })

  await as('Paul').people.updatePreferences({ receivesDigest: true })

  const spec = await fetch(`${baseUrl}/api/v1/openapi.json`).then((response) => response.json())

  expect(Object.keys(spec.paths)).toEqual(
    expect.arrayContaining([
      '/workspaces/{workspaceId}/home',
      '/workspaces/{workspaceId}/reports/{month}',
      '/me/preferences',
    ]),
  )

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${agentKey}`,
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
    expect.arrayContaining(['getHomeOverview', 'getMonthlyReport', 'getMyPreferences']),
  )

  expect(names).not.toContain('updateMyPreferences')
})

test('the monthly report counts the words people wrote and reviewed, own approvals and unsent drafts left out', async () => {
  const month = new Date().toISOString().slice(0, 7)

  await saveAndSend({
    name: 'Wes',
    project: reportProjectId,
    source: 'Enregistrer',
    value: 'Zapisz',
  })

  await saveAndSend({
    name: 'Wes',
    project: reportProjectId,
    source: 'Supprimer',
    value: 'Usuń element',
  })

  const unsent = await textBySource({
    name: 'Wes',
    project: reportProjectId,
    source: 'Fin le {date}',
  })

  await as('Wes').drafts.save({
    projectId: reportProjectId,
    textId: unsent.id,
    language: 'pl',
    value: 'Koniec {date} dziś',
  })

  for (const source of ['Enregistrer', 'Supprimer']) {
    const text = await textBySource({ name: 'Rex', project: reportProjectId, source })
    const draft = text.translations.find(({ language }) => language === 'pl')?.draft

    await as('Rex').reviews.approve({
      projectId: reportProjectId,
      textId: text.id,
      language: 'pl',
      ...(draft ? { draftId: draft.id } : {}),
    })
  }

  const outbid = await textBySource({
    name: 'Rex',
    project: reportProjectId,
    source: 'Enchère dépassée',
  })

  await as('Rex').reviews.approve({ projectId: reportProjectId, textId: outbid.id, language: 'pl' })

  const report = await as('Rita').reports.monthly({ workspaceId: reportWorkspaceId, month })

  expect(report.month).toBe(month)

  expect(
    report.people.map(({ user, written, reviewed }) => [user.name, written, reviewed]),
  ).toEqual([
    ['Rex', { texts: 0, words: 0 }, { texts: 3, words: 5 }],
    ['Wes', { texts: 2, words: 3 }, { texts: 0, words: 0 }],
  ])

  expect(report.people[1]?.languages).toEqual([
    { language: 'pl', written: { texts: 2, words: 3 }, reviewed: { texts: 0, words: 0 } },
  ])

  expect(report.totals).toEqual({
    written: { texts: 2, words: 3 },
    reviewed: { texts: 3, words: 5 },
  })
})

test('the report of a month holds what was written and approved inside its first and last second', async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  async function draft(options: {
    textId: string
    value: string
    status: DraftStatus
    at: string
  }) {
    await connection.drizzle.insert(drafts).values({
      projectId: reportProjectId,
      textId: options.textId,
      language: 'pl',
      value: options.value,
      authorId: 'user-rep-wes',
      status: options.status,
      createdAt: new Date(options.at),
    })
  }

  async function approval(options: {
    textId: string
    words: number
    selfApproved: boolean
    at: string
  }) {
    await connection.drizzle.insert(approvals).values({
      projectId: reportProjectId,
      textId: options.textId,
      language: 'pl',
      sourceHash: hashText(options.textId),
      targetHash: hashText(`${options.textId}-pl`),
      reviewerId: 'user-rep-rex',
      selfApproved: options.selfApproved,
      words: options.words,
      createdAt: new Date(options.at),
    })
  }

  await draft({
    textId: 'old-1',
    value: 'Dobrze zrobione dziś',
    status: 'IN_REVIEW',
    at: '2020-03-31T23:59:59Z',
  })
  await draft({ textId: 'old-2', value: 'Tak', status: 'RELEASED', at: '2020-03-15T10:00:00Z' })
  await draft({
    textId: 'old-3',
    value: 'Nie wiem',
    status: 'WITHDRAWN',
    at: '2020-03-10T10:00:00Z',
  })
  await draft({
    textId: 'old-4',
    value: 'Jeszcze nie',
    status: 'DRAFT',
    at: '2020-03-11T10:00:00Z',
  })
  await draft({
    textId: 'old-5',
    value: 'Poza miesiącem',
    status: 'IN_REVIEW',
    at: '2020-04-01T00:00:00Z',
  })
  await approval({ textId: 'old-1', words: 7, selfApproved: false, at: '2020-03-20T10:00:00Z' })
  await approval({ textId: 'old-2', words: 9, selfApproved: true, at: '2020-03-21T10:00:00Z' })
  await approval({ textId: 'old-6', words: 100, selfApproved: false, at: '2020-02-29T23:59:59Z' })
  await connection.close()

  const march = await as('Rita').reports.monthly({
    workspaceId: reportWorkspaceId,
    month: '2020-03',
  })

  expect(march.people.map(({ user, written, reviewed }) => [user.name, written, reviewed])).toEqual(
    [
      ['Rex', { texts: 0, words: 0 }, { texts: 1, words: 7 }],
      ['Wes', { texts: 2, words: 4 }, { texts: 0, words: 0 }],
    ],
  )

  const april = await as('Rita').reports.monthly({
    workspaceId: reportWorkspaceId,
    month: '2020-04',
  })

  expect(april.totals).toEqual({
    written: { texts: 1, words: 2 },
    reviewed: { texts: 0, words: 0 },
  })

  await expect(
    as('Rita').reports.monthly({ workspaceId: reportWorkspaceId, month: '2019-01' }),
  ).resolves.toMatchObject({
    people: [],
    totals: { written: { texts: 0 }, reviewed: { texts: 0 } },
  })
})

test('only owners and admins read the report, and the month must be a month', async () => {
  for (const name of ['Wes', 'Rex']) {
    await expect(
      as(name).reports.monthly({ workspaceId: reportWorkspaceId, month: '2020-03' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  }

  await expect(
    as('Rita').reports.monthly({ workspaceId: reportWorkspaceId, month: '2020-13' }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
})

test('the digest waits for its hour, then writes once to each person who has something to do', async () => {
  const { service, sink, db, projectId } = fixture()

  await service.tick({ now: new Date(Date.UTC(2026, 10, 30, 6, 59)) })

  expect(sink.mails()).toHaveLength(0)
  expect(await digestJobs()).toEqual([])

  await service.tick({ now: new Date(Date.UTC(2026, 10, 30, 7, 5)) })

  const [mail] = sink.mails()

  expect(sink.mails()).toHaveLength(1)
  expect(mail?.to).toBe('lena@digest.test')
  expect(mail?.from).toContain('glot@digest.test')

  expect(await digestJobs()).toEqual([
    { userId: 'user-dig-lena', day: '2026-11-30', status: JOB_STATUSES.DONE },
    { userId: 'user-dig-vic', day: '2026-11-30', status: JOB_STATUSES.DONE },
  ])

  const lena = await db.user.findFirst({ where: { id: 'user-dig-lena' } }).throw()

  const overview = await new HomeService({
    ...fixture().context,
    actor: {
      kind: ACTOR_KINDS.PERSON,
      sessionId: null,
      user: {
        id: lena.id,
        email: lena.email,
        name: lena.name,
        image: lena.image,
        locale: lena.locale,
      },
    },
  }).overview({ workspaceId: fixture().workspaceId })

  expect(mail?.subject).toBe(`${overview.needsYou.total} things need you in Glot`)
  expect(overview.needsYou.total).toBeGreaterThan(1)

  for (const content of [mail?.text ?? '', mail?.html ?? '']) {
    expect(content).toContain('Léna')
    expect(content).toContain('marketplace.itemCard.endedOn in Polish')
    expect(content).toContain('The placeholders must match the source text')
    expect(content).toContain(`${APP_URL}/projects/${projectId}/review/pl`)
    expect(content).toContain(`${APP_URL}/settings`)
  }

  expect(mail?.text).toContain('Hello Léna & Co,')
  expect(mail?.text).toMatch(/Texts to review\r?\n- \d+ texts in Polish, Demo apps/u)
  expect(mail?.html).toContain('Hello Léna &amp; Co,')
  expect(mail?.html).toMatch(
    /<a href="https:\/\/glot\.example\.test\/projects\/[^"]+\/texts\?text=[^"]+"/u,
  )
  expect(mail?.html).not.toContain('Léna & Co')
})

test('the same day never sends twice, the next day sends again', async () => {
  const { service, sink } = fixture()

  await service.tick({ now: new Date(Date.UTC(2026, 10, 30, 7, 30)) })
  await service.tick({ now: new Date(Date.UTC(2026, 10, 30, 20, 0)) })

  expect(sink.mails()).toHaveLength(1)

  expect(await digestJobs()).toEqual([
    { userId: 'user-dig-lena', day: '2026-11-30', status: JOB_STATUSES.DONE },
    { userId: 'user-dig-vic', day: '2026-11-30', status: JOB_STATUSES.DONE },
  ])

  await service.tick({ now: new Date(Date.UTC(2026, 11, 1, 7, 0)) })

  expect(sink.mails().map(({ to }) => to)).toEqual(['lena@digest.test', 'lena@digest.test'])
  expect(await digestJobs()).toHaveLength(4)
})

test('turning the email off stops it, even for a job planned earlier that day', async () => {
  const { service, sink, db } = fixture()

  await db.user.update({ where: { id: 'user-dig-lena' }, data: { receivesDigest: false } })
  await service.tick({ now: new Date(Date.UTC(2026, 11, 2, 7, 10)) })

  expect(sink.mails()).toHaveLength(2)
  expect((await digestJobs()).filter(({ userId }) => userId === 'user-dig-lena')).toHaveLength(2)

  await db.user.update({ where: { id: 'user-dig-lena' }, data: { receivesDigest: true } })

  await db.jobs.create({
    data: {
      kind: JOB_KINDS.DIGEST,
      userId: 'user-dig-lena',
      runAt: new Date(Date.UTC(2026, 11, 3, 7)),
    },
  })

  await db.user.update({ where: { id: 'user-dig-lena' }, data: { receivesDigest: false } })
  await service.tick({ now: new Date(Date.UTC(2026, 11, 3, 7, 10)) })

  expect(sink.mails()).toHaveLength(2)

  expect(
    (await digestJobs()).filter(
      ({ userId, day }) => userId === 'user-dig-lena' && day === '2026-12-03',
    ),
  ).toEqual([{ userId: 'user-dig-lena', day: '2026-12-03', status: JOB_STATUSES.DONE }])
})

test('a mail the server refuses is recorded as failed and is not tried again that day', async () => {
  const { service, failing, sink, db } = fixture()

  await db.user.update({ where: { id: 'user-dig-lena' }, data: { receivesDigest: true } })
  await failing.tick({ now: new Date(Date.UTC(2026, 11, 4, 7, 0)) })

  const failed = await db.jobs.findMany({
    where: { userId: 'user-dig-lena', status: JOB_STATUSES.FAILED },
  })

  expect(failed).toHaveLength(1)
  expect(failed[0]?.error).toBeTruthy()

  await service.tick({ now: new Date(Date.UTC(2026, 11, 4, 7, 30)) })

  expect(sink.mails()).toHaveLength(2)

  expect(
    await db.jobs.count({ where: { userId: 'user-dig-lena', status: JOB_STATUSES.FAILED } }),
  ).toBe(1)
})
