import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const LOCALES = 'packages/translations/i18n/locales'

const PEOPLE = [
  { id: 'user-paul', name: 'Paul', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'user-lena', name: 'Lena', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'user-dora', name: 'Dora', role: WORKSPACE_ROLES.REVIEWER, languages: ['de'] },
  { id: 'user-max', name: 'Max', role: WORKSPACE_ROLES.REVIEWER, languages: ['de'] },
  { id: 'user-nina', name: 'Nina', role: WORKSPACE_ROLES.REVIEWER, languages: ['nl'] },
  { id: 'user-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
let projectId = ''
let repository = ''

function as(name: string) {
  const client = clients.get(name)

  if (!client) throw new Error(`${name} is not signed in`)

  return client
}

async function textBySource(options: { name: string; source: string }) {
  const page = await as(options.name).texts.search({ projectId, q: options.source })
  const text = page.items.find((item) => item.source.value === options.source)

  if (!text) throw new Error(`No text reads ${options.source}`)

  return text
}

async function draftAndSend(options: {
  name: string
  source: string
  language: string
  value: string
}) {
  const text = await textBySource(options)

  const draft = await as(options.name).drafts.save({
    projectId,
    textId: text.id,
    language: options.language,
    value: options.value,
  })

  return as(options.name).drafts.send({ projectId, draftId: draft.id })
}

function translationOf(options: {
  text: Awaited<ReturnType<typeof textBySource>>
  language: string
}) {
  const found = options.text.translations.find((item) => item.language === options.language)

  if (!found) throw new Error(`No ${options.language} translation`)

  return found
}

async function commitLocale(options: { language: string; edit: (messages: unknown) => void }) {
  const file = join(repository, LOCALES, `${options.language}.json`)
  const messages: unknown = JSON.parse(await readFile(file, 'utf8'))

  options.edit(messages)
  await writeFile(file, JSON.stringify(messages, null, 2))
  await run('git', ['-C', repository, 'add', '--all'])

  await run('git', [
    '-C',
    repository,
    '-c',
    'user.name=Dev',
    '-c',
    'user.email=dev@glot.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--message',
    `Change ${options.language}`,
  ])
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Review', slug: 'review' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@review.test`,
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
    repository: 'glot/review',
  })

  await connection.close()
  projectId = project.id

  const seeded = await seedDemoRepository({
    root: inject('repositoriesRoot'),
    repository: 'glot/review',
  })

  repository = seeded.directory

  for (const person of PEOPLE) {
    const cookie = await signInByMagicLink(`${person.name.toLowerCase()}@review.test`)

    clients.set(person.name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }
})

test('a writer drafts and sends; a reviewer of that language approves it', async () => {
  const text = await textBySource({ name: 'Paul', source: 'Enregistrer' })

  const draft = await as('Paul').drafts.save({
    projectId,
    textId: text.id,
    language: 'pl',
    value: 'Zapisz',
  })

  expect(draft).toMatchObject({
    authorId: 'user-paul',
    status: 'DRAFT',
    value: 'Zapisz',
    failures: [],
  })

  const own = await textBySource({ name: 'Paul', source: 'Enregistrer' })

  expect(translationOf({ text: own, language: 'pl' })).toMatchObject({
    value: 'Ratować',
    draft: { id: draft.id, status: 'DRAFT' },
  })

  const hidden = await textBySource({ name: 'Lena', source: 'Enregistrer' })

  expect(translationOf({ text: hidden, language: 'pl' }).draft).toBeNull()

  const sent = await as('Paul').drafts.send({ projectId, draftId: draft.id })

  expect(sent.status).toBe('IN_REVIEW')

  const queue = await as('Lena').reviews.queue({ projectId, language: 'pl' })
  const item = queue.items.find((entry) => entry.text.id === text.id)

  expect(item).toMatchObject({
    reason: 'SENT_FOR_REVIEW',
    draft: { id: draft.id, value: 'Zapisz' },
  })

  const approved = await as('Lena').reviews.approve({
    projectId,
    textId: text.id,
    language: 'pl',
    draftId: draft.id,
  })

  expect(translationOf({ text: approved, language: 'pl' })).toMatchObject({
    value: 'Zapisz',
    state: 'REVIEWED',
    reviewedBy: 'user-lena',
    selfApproved: false,
  })

  const after = await as('Lena').reviews.queue({ projectId, language: 'pl' })

  expect(after.items.map((entry) => entry.text.id)).not.toContain(text.id)
})

test('a reviewer of another language, a writer and a viewer cannot approve it', async () => {
  const text = await textBySource({ name: 'Nina', source: 'Supprimer' })

  await expect(
    as('Nina').reviews.approve({ projectId, textId: text.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Paul').reviews.approve({ projectId, textId: text.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Vic').reviews.approve({ projectId, textId: text.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(as('Nina').reviews.queue({ projectId, language: 'pl' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  })

  await expect(
    as('Nina').drafts.save({ projectId, textId: text.id, language: 'pl', value: 'Usuń' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Vic').drafts.save({ projectId, textId: text.id, language: 'pl', value: 'Usuń' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const untouched = await textBySource({ name: 'Lena', source: 'Supprimer' })

  expect(translationOf({ text: untouched, language: 'pl' }).state).toBe('TO_CHECK')
})

test('a language with one reviewer lets them approve their own change, marked self-approved', async () => {
  const text = await textBySource({ name: 'Lena', source: 'Supprimer' })

  const sent = await draftAndSend({
    name: 'Lena',
    source: 'Supprimer',
    language: 'pl',
    value: 'Usuń',
  })

  const approved = await as('Lena').reviews.approve({
    projectId,
    textId: text.id,
    language: 'pl',
    draftId: sent.id,
  })

  expect(translationOf({ text: approved, language: 'pl' })).toMatchObject({
    value: 'Usuń',
    state: 'REVIEWED',
    reviewedBy: 'user-lena',
    selfApproved: true,
  })
})

test('with two reviewers the author cannot approve their own change, the other can', async () => {
  const text = await textBySource({ name: 'Dora', source: 'Supprimer' })

  const sent = await draftAndSend({
    name: 'Dora',
    source: 'Supprimer',
    language: 'de',
    value: 'Löschen',
  })

  await expect(
    as('Dora').reviews.approve({ projectId, textId: text.id, language: 'de', draftId: sent.id }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const own = await as('Dora').reviews.queue({ projectId, language: 'de' })

  expect(own.items.map((entry) => entry.draft?.id)).not.toContain(sent.id)

  const other = await as('Max').reviews.queue({ projectId, language: 'de' })

  expect(other.items.map((entry) => entry.draft?.id)).toContain(sent.id)

  const approved = await as('Max').reviews.approve({
    projectId,
    textId: text.id,
    language: 'de',
    draftId: sent.id,
  })

  expect(translationOf({ text: approved, language: 'de' })).toMatchObject({
    value: 'Löschen',
    state: 'REVIEWED',
    reviewedBy: 'user-max',
    selfApproved: false,
  })
})

test('a reviewer corrects a text and approves it in one step', async () => {
  const text = await textBySource({ name: 'Lena', source: 'Enchère dépassée' })

  const approved = await as('Lena').reviews.editAndApprove({
    projectId,
    textId: text.id,
    language: 'pl',
    value: 'Przebito ofertę',
  })

  expect(translationOf({ text: approved, language: 'pl' })).toMatchObject({
    value: 'Przebito ofertę',
    state: 'REVIEWED',
    reviewedBy: 'user-lena',
    selfApproved: true,
  })

  await expect(
    as('Lena').reviews.editAndApprove({
      projectId,
      textId: text.id,
      language: 'pl',
      value: 'Oferta {price}',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' })
})

test('a change request sends the draft back to its author with the comment', async () => {
  const source = '{count} enchère | {count} enchères'
  const text = await textBySource({ name: 'Paul', source })

  const sent = await draftAndSend({
    name: 'Paul',
    source,
    language: 'pl',
    value: '{count} oferta | {count} ofert',
  })

  const comment = await as('Lena').reviews.requestChange({
    projectId,
    textId: text.id,
    language: 'pl',
    draftId: sent.id,
    body: 'Use the plural of the other lists',
  })

  expect(comment).toMatchObject({ kind: 'CHANGE_REQUEST', authorName: 'Lena' })

  const back = await textBySource({ name: 'Paul', source })

  expect(translationOf({ text: back, language: 'pl' }).draft).toMatchObject({
    id: sent.id,
    status: 'DRAFT',
  })

  const comments = await as('Paul').reviews.comments({ projectId, textId: text.id, language: 'pl' })

  expect(comments.map((entry) => [entry.kind, entry.body])).toEqual([
    ['CHANGE_REQUEST', 'Use the plural of the other lists'],
  ])

  const queue = await as('Lena').reviews.queue({ projectId, language: 'pl' })

  expect(queue.items.map((entry) => entry.text.id)).not.toContain(text.id)
})

test('a draft that fails a check cannot be sent, and a draft can be withdrawn', async () => {
  const text = await textBySource({ name: 'Paul', source: 'Fin le {date}' })

  const draft = await as('Paul').drafts.save({
    projectId,
    textId: text.id,
    language: 'pl',
    value: 'Koniec {data}',
  })

  expect(draft.failures).toHaveLength(1)

  await expect(as('Paul').drafts.send({ projectId, draftId: draft.id })).rejects.toMatchObject({
    code: 'CONFLICT',
  })

  await expect(as('Lena').drafts.withdraw({ projectId, draftId: draft.id })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })

  const withdrawn = await as('Paul').drafts.withdraw({ projectId, draftId: draft.id })

  expect(withdrawn.status).toBe('WITHDRAWN')

  const after = await textBySource({ name: 'Paul', source: 'Fin le {date}' })

  expect(translationOf({ text: after, language: 'pl' }).draft).toBeNull()
})

test('every text whose source and target are already approved together is approved at once', async () => {
  await commitLocale({
    language: 'fr',
    edit: (messages) => {
      Object.assign(Object(Reflect.get(Object(messages), 'marketplace')), {
        lotDescription: 'Enregistrer',
      })
    },
  })

  await commitLocale({
    language: 'pl',
    edit: (messages) => {
      Object.assign(Object(Reflect.get(Object(messages), 'marketplace')), {
        lotDescription: 'Zapisz',
      })
    },
  })

  await as('Lena').projects.sync({ projectId })

  const before = await as('Lena').reviews.queue({ projectId, language: 'pl' })

  expect(before.sameElsewhere).toBe(1)

  await expect(as('Nina').reviews.approveSame({ projectId, language: 'pl' })).rejects.toMatchObject(
    { code: 'FORBIDDEN' },
  )

  await expect(as('Lena').reviews.approveSame({ projectId, language: 'pl' })).resolves.toEqual({
    approved: 1,
  })

  const page = await as('Lena').texts.search({ projectId, q: 'Enregistrer' })

  expect(page.items.map((text) => translationOf({ text, language: 'pl' }).state)).toEqual([
    'REVIEWED',
    'REVIEWED',
  ])
})

test('an agent key may draft but never approve, and MCP hides every approving tool', async () => {
  const agentKey = inject('agentKey')
  const agent = createGlotClient({ url: baseUrl, token: agentKey })

  for (const call of [
    () => agent.reviews.approve({ projectId, textId: 'x', language: 'pl' }),
    () => agent.reviews.editAndApprove({ projectId, textId: 'x', language: 'pl', value: 'x' }),
    () => agent.reviews.approveSame({ projectId, language: 'pl' }),
    () => agent.reviews.requestChange({ projectId, textId: 'x', language: 'pl', body: 'x' }),
  ]) {
    await expect(call()).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })
  }

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

  expect(names).toEqual(expect.arrayContaining(['saveDraft', 'sendDraftForReview']))

  for (const approving of [
    'approveText',
    'editAndApproveText',
    'approveSameTexts',
    'requestChange',
  ]) {
    expect(names).not.toContain(approving)
  }
})
