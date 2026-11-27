import { ACTOR_KINDS, createGlotAuth } from '@glot/auth'
import { AI_FILL_STATUSES } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { JOB_KINDS } from '@glot/database/constants/jobs'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import type { Database } from '@glot/database'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { afterAll, beforeAll, expect, inject, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'
import { AiFillJobsService } from '../server/domains/ai/services/ai-fill-jobs.service.ts'
import { AiService } from '../server/domains/ai/services/ai.service.ts'
import { AiSettingsService } from '../server/domains/ai/services/ai-settings.service.ts'
import type { RequestContext } from '../server/types/context.types.ts'
import { testAiRuntime } from './support/ai-runtime.ts'
import { scriptSink, sinkRequests } from './support/ai-sink.ts'
import { seedBulkRepository } from './support/bulk-repository.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const sink = inject('aiSinkUrl')
const secret = inject('authSecret')
const MAIN_KEY = 'sk-ant-main-key-0001'
const OPENAI_KEY = 'sk-openai-main-key-9876'
const FILL_KEY = 'sk-ant-fill-key-4242'
const SONNET_COST_PER_1000_IN_500_OUT = 0.007

const MAIN_PEOPLE = [
  { id: 'user-ai-olga', name: 'Olga', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-ai-adam', name: 'Adam', role: WORKSPACE_ROLES.ADMIN, languages: null },
  { id: 'user-ai-lena', name: 'Lena', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'user-ai-lia', name: 'Lia', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'user-ai-paul', name: 'Paul', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'user-ai-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
]

const FILL_PEOPLE = [
  { id: 'user-aif-fiona', name: 'Fiona', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-aif-wanda', name: 'Wanda', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
let mainWorkspaceId = ''
let mainProjectId = ''
let fillWorkspaceId = ''
let bulkProjectId = ''
let agentKey = ''
let connection: ReturnType<typeof createDatabase>
let jobs: AiFillJobsService
let repositoriesRoot = ''

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
        email: `${person.name.toLowerCase()}@${options.domain}`,
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

function baseContext(): Omit<RequestContext, 'actor'> {
  const reader = new LocalGitReader({ root: repositoriesRoot })

  return {
    auth: createGlotAuth({
      baseURL: baseUrl,
      database: connection.drizzle,
      secret,
      trustedOrigins: [baseUrl],
    }),
    db: connection.db,
    catalog: new CatalogService({ reader }),
    git: reader,
    ai: testAiRuntime({ secret, baseUrl: sink, batchSize: 5, concurrency: 2 }),
  }
}

async function personContext(userId: string): Promise<RequestContext> {
  const user = await connection.db.user.findFirst({ where: { id: userId } }).throw()

  return {
    ...baseContext(),
    actor: {
      kind: ACTOR_KINDS.PERSON,
      sessionId: null,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        locale: user.locale,
      },
    },
  }
}

async function tick() {
  await jobs.tick({ now: new Date() })
}

async function setKeyAndBudget(options: {
  name: string
  workspaceId: string
  key: string
  provider?: 'ANTHROPIC' | 'OPENAI'
  budgetUsd: number
}) {
  const provider = options.provider ?? 'ANTHROPIC'

  await as(options.name).ai.setKey({ workspaceId: options.workspaceId, provider, key: options.key })

  await as(options.name).ai.updateSettings({
    workspaceId: options.workspaceId,
    provider,
    model: provider === 'ANTHROPIC' ? 'claude-sonnet-5-5' : 'gpt-6.2-sol',
    monthlyBudgetUsd: options.budgetUsd,
  })
}

beforeAll(async () => {
  connection = createDatabase({ connectionString: inject('databaseUrl') })
  const { db } = connection
  repositoriesRoot = inject('repositoriesRoot')

  const main = await db.workspaces.create({ data: { name: 'AI', slug: 'ai-main' } })
  const fill = await db.workspaces.create({ data: { name: 'AI fill', slug: 'ai-fill' } })

  await addPeople({ db, workspaceId: main.id, people: MAIN_PEOPLE, domain: 'ai.test' })
  await addPeople({ db, workspaceId: fill.id, people: FILL_PEOPLE, domain: 'aifill.test' })

  await db.user.create({
    data: { id: 'user-ai-eve', name: 'Eve', email: 'eve@ai.test', emailVerified: true },
  })

  const mainProject = await seedDemoProject(db, {
    workspaceId: main.id,
    repository: 'glot/ai-demo',
  })

  const bulk = await db.projects.create({
    data: {
      workspaceId: fill.id,
      name: 'Bulk',
      repository: 'glot/ai-bulk',
      sourceLanguage: 'fr',
      languages: ['fr', 'pl', 'en'],
    },
  })

  await db.projectSources.create({
    data: {
      projectId: bulk.id,
      name: 'app',
      pathPattern: 'i18n/{locale}.json',
      sourceLanguage: 'fr',
      languages: ['fr', 'pl', 'en'],
    },
  })

  const auth = createGlotAuth({
    baseURL: baseUrl,
    database: connection.drizzle,
    secret,
    trustedOrigins: [baseUrl],
  })

  agentKey = (await auth.api.createApiKey({ body: { userId: 'user-ai-olga', name: 'AI' } })).key
  mainWorkspaceId = main.id
  mainProjectId = mainProject.id
  fillWorkspaceId = fill.id
  bulkProjectId = bulk.id

  await seedDemoRepository({ root: repositoriesRoot, repository: 'glot/ai-demo' })
  await seedBulkRepository({ root: repositoriesRoot, repository: 'glot/ai-bulk', count: 23 })

  for (const person of [...MAIN_PEOPLE, ...FILL_PEOPLE]) {
    const domain = person.id.startsWith('user-aif-') ? 'aifill' : 'ai'
    const cookie = await signInByMagicLink(`${person.name.toLowerCase()}@${domain}.test`)

    clients.set(person.name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }

  clients.set(
    'Eve',
    createGlotClient({
      url: baseUrl,
      fetch: withCookie(await signInByMagicLink('eve@ai.test')),
    }),
  )

  jobs = new AiFillJobsService({ context: baseContext() })

  const glossary = await as('Olga').glossary.createConcept({
    workspaceId: main.id,
    name: 'lot',
    definition: 'An item sold at auction, never a plot of land.',
    neverTranslate: false,
    notes: '',
    terms: {
      fr: { term: 'lot', plural: 'lots', avoid: [] },
      pl: { term: 'partia', plural: 'partie', avoid: ['działka'] },
    },
  })

  await as('Olga').glossary.setConceptStatus({ conceptId: glossary.id, status: 'VALIDATED' })
})

afterAll(async () => {
  await connection.close()
})

test('only owners and admins see how AI is set up, and the key is never returned', async () => {
  for (const name of ['Olga', 'Adam']) {
    await expect(as(name).ai.settings({ workspaceId: mainWorkspaceId })).resolves.toEqual({
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-5-5',
      monthlyBudgetUsd: 10,
      keys: [
        { provider: 'ANTHROPIC', set: false, last4: null },
        { provider: 'OPENAI', set: false, last4: null },
      ],
      defaults: [
        { provider: 'ANTHROPIC', model: 'claude-sonnet-5-5' },
        { provider: 'OPENAI', model: 'gpt-6.2-sol' },
      ],
    })
  }

  for (const name of ['Lena', 'Paul', 'Vic']) {
    await expect(as(name).ai.settings({ workspaceId: mainWorkspaceId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })

    await expect(
      as(name).ai.setKey({ workspaceId: mainWorkspaceId, provider: 'ANTHROPIC', key: MAIN_KEY }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    await expect(as(name).ai.usage({ workspaceId: mainWorkspaceId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  }

  await expect(as('Eve').ai.settings({ workspaceId: mainWorkspaceId })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })

  await expect(
    as('Olga').ai.setKey({ workspaceId: mainWorkspaceId, provider: 'ANTHROPIC', key: MAIN_KEY }),
  ).resolves.toEqual({ provider: 'ANTHROPIC', set: true, last4: '0001' })

  const settings = await as('Olga').ai.settings({ workspaceId: mainWorkspaceId })

  expect(settings.keys[0]).toEqual({ provider: 'ANTHROPIC', set: true, last4: '0001' })
  expect(JSON.stringify(settings)).not.toContain(MAIN_KEY)

  const stored = await connection.db.aiKeys.findFirst({ where: { workspaceId: mainWorkspaceId } })

  expect(stored?.ciphertext).toMatch(/^v1\.[\w+/=]+\.[\w+/=]+\.[\w+/=]+$/u)
  expect(stored?.ciphertext).not.toContain(MAIN_KEY)
  expect(stored?.last4).toBe('0001')

  await as('Olga').ai.setKey({ workspaceId: mainWorkspaceId, provider: 'ANTHROPIC', key: MAIN_KEY })

  const again = await connection.db.aiKeys.findFirst({ where: { workspaceId: mainWorkspaceId } })

  expect(again?.ciphertext).not.toBe(stored?.ciphertext)
})

test('the provider, the model and the budget are chosen by people, never by a key', async () => {
  const agent = createGlotClient({ url: baseUrl, token: agentKey })

  await expect(agent.ai.settings({ workspaceId: mainWorkspaceId })).resolves.toMatchObject({
    provider: 'ANTHROPIC',
  })

  await expect(
    agent.ai.updateSettings({
      workspaceId: mainWorkspaceId,
      provider: 'OPENAI',
      model: 'gpt-6.2-sol',
      monthlyBudgetUsd: 1,
    }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(
    agent.ai.setKey({ workspaceId: mainWorkspaceId, provider: 'OPENAI', key: OPENAI_KEY }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(
    agent.ai.removeKey({ workspaceId: mainWorkspaceId, provider: 'OPENAI' }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(
    as('Adam').ai.updateSettings({
      workspaceId: mainWorkspaceId,
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-5-5',
      monthlyBudgetUsd: -1,
    }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

  await expect(
    as('Adam').ai.updateSettings({
      workspaceId: mainWorkspaceId,
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-5-5',
      monthlyBudgetUsd: 25.5,
    }),
  ).resolves.toMatchObject({ provider: 'ANTHROPIC', monthlyBudgetUsd: 25.5 })

  const spec = await fetch(`${baseUrl}/api/v1/openapi.json`).then((response) => response.json())

  expect(Object.keys(spec.paths)).toEqual(
    expect.arrayContaining([
      '/workspaces/{workspaceId}/ai/settings',
      '/workspaces/{workspaceId}/ai/keys/{provider}',
      '/workspaces/{workspaceId}/ai/usage',
      '/projects/{projectId}/texts/{textId}/ai/suggestion',
      '/projects/{projectId}/ai/fills',
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
    expect.arrayContaining([
      'suggestTextWithAi',
      'fillMissingTextsWithAi',
      'listAiFills',
      'getAiUsage',
      'getAiSettings',
    ]),
  )

  for (const deciding of ['updateAiSettings', 'setAiKey', 'removeAiKey']) {
    expect(names).not.toContain(deciding)
  }
})

test('a suggestion keeps every placeholder, tag and link, and carries the context the model needs', async () => {
  await scriptSink({
    url: sink,
    key: MAIN_KEY,
    steps: [{ usage: { input: 1000, output: 500 } }],
  })

  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  const suggestion = await as('Paul').ai.suggest({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
  })

  expect(suggestion).toEqual({
    value: '[pl] Fin le {date}',
    reason: 'Recorded answer',
    failures: [],
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-5-5',
    usage: { inputTokens: 1000, outputTokens: 500, costUsd: SONNET_COST_PER_1000_IN_500_OUT },
  })

  const [recorded] = await sinkRequests({ url: sink, key: MAIN_KEY })

  expect(recorded).toMatchObject({
    provider: 'anthropic',
    path: '/v1/messages',
    headers: { 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: { model: 'claude-sonnet-5-5', max_tokens: 16000, messages: [{ role: 'user' }] },
  })

  expect(Object.keys(recorded?.body ?? {}).toSorted()).toEqual([
    'max_tokens',
    'messages',
    'model',
    'system',
  ])

  expect(recorded?.body.system).toContain('numbered tokens')

  const job = JSON.parse(recorded?.body.messages[0].content)

  expect(job).toMatchObject({
    sourceLanguage: 'French',
    targetLanguage: 'Polish',
    targetLanguageCode: 'pl',
    pluralCategories: ['one', 'few', 'many', 'other'],
    texts: [
      {
        id: 1,
        key: 'shared-base: marketplace › itemCard › endedOn',
        where: 'shared-base',
        shownIn: ['Admin', 'Market'],
        source: 'Fin le ⟦1⟧',
        tokens: { '⟦1⟧': '{date}' },
        pluralForms: 1,
        otherLanguages: { en: 'Ended on {date}', de: 'Endet am {date}', nl: 'Eindigt op {date}' },
      },
    ],
  })
})

test('the glossary terms, the words to avoid and the plural forms of the source go into the prompt', async () => {
  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{}] })

  const lot = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Ce lot est vendu aux enchères.',
  })

  await as('Paul').ai.suggest({ projectId: mainProjectId, textId: lot.id, language: 'pl' })

  const bids = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: '{count} enchère | {count} enchères',
  })

  await as('Paul').ai.suggest({ projectId: mainProjectId, textId: bids.id, language: 'pl' })

  const terms = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'J’accepte les <a href="/terms">conditions</a>',
  })

  const tagged = await as('Paul').ai.suggest({
    projectId: mainProjectId,
    textId: terms.id,
    language: 'pl',
  })

  expect(tagged.value).toBe('[pl] J’accepte les <a href="/terms">conditions</a>')

  const [first, second, third] = (await sinkRequests({ url: sink, key: MAIN_KEY })).map((request) =>
    JSON.parse(request.body.messages[0].content),
  )

  expect(first.glossary).toEqual([
    {
      concept: 'lot',
      definition: 'An item sold at auction, never a plot of land.',
      neverTranslate: false,
      source: 'lot',
      target: { term: 'partia', plural: 'partie' },
    },
  ])

  expect(first.avoidWords).toEqual(['działka'])
  expect(first.texts[0].source).toBe('Ce lot est vendu aux enchères.')
  expect(second.texts[0]).toMatchObject({
    source: '⟦1⟧ enchère | ⟦2⟧ enchères',
    tokens: { '⟦1⟧': '{count}', '⟦2⟧': '{count}' },
    pluralForms: 2,
  })

  expect(third.texts[0]).toMatchObject({
    source: 'J’accepte les ⟦1⟧conditions⟦2⟧',
    tokens: { '⟦1⟧': '<a href="/terms">', '⟦2⟧': '</a>' },
  })
})

test('an answer that drops, repeats or invents a token is refused after one retry that says what was wrong', async () => {
  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  const input = { projectId: mainProjectId, textId: ended.id, language: 'pl' }

  const expected = {
    drop: '⟦1⟧ is missing: it stands for {date}',
    duplicate: '⟦1⟧ appears 2 times instead of once',
    invent: '⟦99⟧ does not exist in the source text',
  }

  for (const mode of ['drop', 'duplicate', 'invent'] as const) {
    await scriptSink({ url: sink, key: MAIN_KEY, steps: [{ corrupt: [{ id: 1, mode }] }] })

    await expect(as('Paul').ai.suggest(input)).rejects.toMatchObject({
      code: 'UNPROCESSABLE_CONTENT',
      message: expect.stringContaining(expected[mode]),
    })

    const requests = await sinkRequests({ url: sink, key: MAIN_KEY })

    expect(requests).toHaveLength(2)

    expect(JSON.parse(requests[1]?.body.messages[0].content).texts[0].previousProblems).toEqual([
      expected[mode],
    ])
  }

  await scriptSink({
    url: sink,
    key: MAIN_KEY,
    steps: [{ times: 1, corrupt: [{ id: 1, mode: 'drop' }] }, {}],
  })

  await expect(as('Paul').ai.suggest(input)).resolves.toMatchObject({
    value: '[pl] Fin le {date}',
  })

  expect(await sinkRequests({ url: sink, key: MAIN_KEY })).toHaveLength(2)
  expect(await connection.db.drafts.count({ where: { projectId: mainProjectId } })).toBe(0)
})

test('a suggestion is not saved, costs what the model reported and shows in the month', async () => {
  const before = await as('Olga').ai.usage({ workspaceId: mainWorkspaceId })

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{ usage: { input: 1000, output: 500 } }] })

  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  await as('Paul').ai.suggest({ projectId: mainProjectId, textId: ended.id, language: 'pl' })

  const after = await as('Olga').ai.usage({ workspaceId: mainWorkspaceId })
  const pl = (usage: typeof after) => usage.languages.find(({ language }) => language === 'pl')

  expect(after.month).toBe(new Date().toISOString().slice(0, 7))
  expect(after.calls - before.calls).toBe(1)
  expect(after.inputTokens - before.inputTokens).toBe(1000)
  expect(after.outputTokens - before.outputTokens).toBe(500)
  expect(after.spentUsd - before.spentUsd).toBeCloseTo(SONNET_COST_PER_1000_IN_500_OUT, 6)
  expect((pl(after)?.texts ?? 0) - (pl(before)?.texts ?? 0)).toBe(1)
  expect(after.budgetUsd).toBe(25.5)

  const today = new Date().toISOString().slice(0, 10)
  const day = (usage: typeof after) => usage.days.find(({ date }) => date === today)
  const suggestions = (usage: typeof after) => usage.kinds.find(({ kind }) => kind === 'SUGGEST')

  expect(after.days).toHaveLength(new Date().getUTCDate())
  expect(after.days[0]?.date).toBe(`${after.month}-01`)
  expect((day(after)?.costUsd ?? 0) - (day(before)?.costUsd ?? 0)).toBeCloseTo(
    SONNET_COST_PER_1000_IN_500_OUT,
    6,
  )
  expect((suggestions(after)?.texts ?? 0) - (suggestions(before)?.texts ?? 0)).toBe(1)
  expect(after.kinds.map(({ kind }) => kind)).toEqual(['SUGGEST', 'FILL'])
  expect(after.remainingUsd).toBeCloseTo(25.5 - after.spentUsd, 6)
  expect(await connection.db.drafts.count({ where: { projectId: mainProjectId } })).toBe(0)
})

test('a viewer, a writer of another language and someone outside cannot ask for a suggestion', async () => {
  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  await expect(
    as('Vic').ai.suggest({ projectId: mainProjectId, textId: ended.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Paul').ai.suggest({ projectId: mainProjectId, textId: ended.id, language: 'de' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Eve').ai.suggest({ projectId: mainProjectId, textId: ended.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await expect(
    as('Paul').ai.suggest({ projectId: mainProjectId, textId: 'unknown', language: 'pl' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('a provider failure is a clear 502, a rate limit is retried, and the key never leaks', async () => {
  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  const input = { projectId: mainProjectId, textId: ended.id, language: 'pl' }

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{ status: 401 }] })

  const failure = await as('Paul')
    .ai.suggest(input)
    .then(
      () => ({ code: 'NONE', message: '' }),
      (error: { code: string; message: string }) => error,
    )

  expect(failure).toMatchObject({ code: 'BAD_GATEWAY' })
  expect(failure.message).toContain('401')
  expect(failure.message).toContain('Recorded failure 401')
  expect(failure.message).not.toContain(MAIN_KEY)
  expect(await sinkRequests({ url: sink, key: MAIN_KEY })).toHaveLength(1)

  await scriptSink({
    url: sink,
    key: MAIN_KEY,
    steps: [{ times: 1, status: 429, retryAfter: 0 }, {}],
  })

  await expect(as('Paul').ai.suggest(input)).resolves.toMatchObject({ value: '[pl] Fin le {date}' })
  expect(await sinkRequests({ url: sink, key: MAIN_KEY })).toHaveLength(2)

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{ status: 500, retryAfter: 0 }] })

  await expect(as('Paul').ai.suggest(input)).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
  expect(await sinkRequests({ url: sink, key: MAIN_KEY })).toHaveLength(3)

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{ stopReason: 'refusal' }] })

  await expect(as('Paul').ai.suggest(input)).rejects.toMatchObject({
    code: 'BAD_GATEWAY',
    message: 'The AI provider declined to answer',
  })
})

test('a stored key that cannot be read is said so, and setting it again repairs it', async () => {
  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  const input = { projectId: mainProjectId, textId: ended.id, language: 'pl' }

  const stored = await connection.db.aiKeys
    .findFirst({ where: { workspaceId: mainWorkspaceId } })
    .throw()

  await connection.db.aiKeys.update({
    where: { id: stored.id },
    data: { ciphertext: `${stored.ciphertext.slice(0, -4)}AAAA` },
  })

  await expect(as('Paul').ai.suggest(input)).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'The stored key cannot be read: set it again',
  })

  await as('Olga').ai.setKey({ workspaceId: mainWorkspaceId, provider: 'ANTHROPIC', key: MAIN_KEY })
  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{}] })
  await expect(as('Paul').ai.suggest(input)).resolves.toMatchObject({ provider: 'ANTHROPIC' })
})

test('OpenAI is called through the Responses API with its own key and model', async () => {
  await setKeyAndBudget({
    name: 'Olga',
    workspaceId: mainWorkspaceId,
    key: OPENAI_KEY,
    provider: 'OPENAI',
    budgetUsd: 25.5,
  })

  await scriptSink({ url: sink, key: OPENAI_KEY, steps: [{ usage: { input: 1000, output: 500 } }] })

  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  const suggestion = await as('Paul').ai.suggest({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
  })

  expect(suggestion).toMatchObject({
    value: '[pl] Fin le {date}',
    provider: 'OPENAI',
    model: 'gpt-6.2-sol',
    usage: { costUsd: SONNET_COST_PER_1000_IN_500_OUT },
  })

  const [recorded] = await sinkRequests({ url: sink, key: OPENAI_KEY })

  expect(recorded).toMatchObject({
    provider: 'openai',
    path: '/v1/responses',
    body: { model: 'gpt-6.2-sol', store: false, max_output_tokens: 16000 },
  })

  expect(recorded?.body.instructions).toContain('numbered tokens')
  expect(JSON.parse(recorded?.body.input).texts[0].source).toBe('Fin le ⟦1⟧')

  await setKeyAndBudget({
    name: 'Olga',
    workspaceId: mainWorkspaceId,
    key: MAIN_KEY,
    budgetUsd: 25.5,
  })
})

test('a suggestion is saved as a draft written by AI, and approving it follows the usual rules', async () => {
  const ended = await textBySource({
    name: 'Lena',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{}] })

  const suggestion = await as('Lena').ai.suggest({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
  })

  const draft = await as('Lena').drafts.save({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
    value: suggestion.value,
    aiWritten: true,
  })

  expect(draft).toMatchObject({ aiWritten: true, status: DRAFT_STATUSES.DRAFT })

  const mine = await textBySource({ name: 'Lena', project: mainProjectId, source: 'Fin le {date}' })

  expect(mine.translations.find(({ language }) => language === 'pl')?.draft).toMatchObject({
    aiWritten: true,
  })

  await as('Lena').drafts.send({ projectId: mainProjectId, draftId: draft.id })

  await expect(
    as('Lena').reviews.approve({
      projectId: mainProjectId,
      textId: ended.id,
      language: 'pl',
      draftId: draft.id,
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const queue = await as('Lia').reviews.queue({ projectId: mainProjectId, language: 'pl' })
  const queued = queue.items.find((item) => item.text.id === ended.id)

  expect(queued).toMatchObject({ reason: 'SENT_FOR_REVIEW', draft: { aiWritten: true } })

  const approved = await as('Lia').reviews.approve({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
    draftId: draft.id,
  })

  const translation = approved.translations.find(({ language }) => language === 'pl')

  expect(translation).toMatchObject({
    state: TEXT_STATES.REVIEWED,
    value: '[pl] Fin le {date}',
    aiWritten: true,
    reviewerName: 'Lia',
    selfApproved: false,
  })

  const resaved = await as('Lena').drafts.save({
    projectId: mainProjectId,
    textId: ended.id,
    language: 'pl',
    value: 'Koniec {date}',
  })

  expect(resaved.aiWritten).toBe(false)
})

test('an AI text stays marked as written by AI once released, and nothing is approved by itself', async () => {
  await as('Olga').releases.run({ projectId: mainProjectId })

  await run('git', ['-C', `${repositoriesRoot}/glot/ai-demo`, 'merge', '--ff-only', 'glot/release'])

  await as('Olga').projects.sync({ projectId: mainProjectId })
  await as('Olga').releases.next({ projectId: mainProjectId })

  const ended = await textBySource({
    name: 'Olga',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  expect(ended.translations.find(({ language }) => language === 'pl')).toMatchObject({
    value: '[pl] Fin le {date}',
    state: TEXT_STATES.REVIEWED,
    aiWritten: true,
  })

  const other = await textBySource({ name: 'Olga', project: mainProjectId, source: 'Enregistrer' })

  expect(other.translations.find(({ language }) => language === 'pl')?.aiWritten).toBe(false)
})

test('the monthly budget stops suggestions', async () => {
  const usage = await as('Olga').ai.usage({ workspaceId: mainWorkspaceId })

  await as('Olga').ai.updateSettings({
    workspaceId: mainWorkspaceId,
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-5-5',
    monthlyBudgetUsd: usage.spentUsd,
  })

  const ended = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Fin le {date}',
  })

  await scriptSink({ url: sink, key: MAIN_KEY, steps: [{}] })

  await expect(
    as('Paul').ai.suggest({ projectId: mainProjectId, textId: ended.id, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: 'The monthly AI budget is reached' })

  expect(await sinkRequests({ url: sink, key: MAIN_KEY })).toHaveLength(0)
  await expect(as('Olga').ai.usage({ workspaceId: mainWorkspaceId })).resolves.toMatchObject({
    remainingUsd: 0,
  })
})

test('filling needs a key, a budget and the right to change the language', async () => {
  await expect(
    as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('No ANTHROPIC key'),
  })

  await setKeyAndBudget({
    name: 'Fiona',
    workspaceId: fillWorkspaceId,
    key: FILL_KEY,
    budgetUsd: 50,
  })

  await expect(
    as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'de' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Eve').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await expect(
    as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'fr' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

test('a fill is queued once, for the clock, in the name of who asked', async () => {
  const queued = await as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' })

  expect(queued).toMatchObject({
    projectId: bulkProjectId,
    language: 'pl',
    status: AI_FILL_STATUSES.QUEUED,
    total: 23,
    filled: 0,
    rejected: 0,
    reason: null,
    requestedByName: 'Wanda',
    finishedAt: null,
  })

  await expect(
    as('Fiona').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' }),
  ).resolves.toMatchObject({
    id: queued.id,
  })

  expect(
    await connection.db.jobs.count({
      where: { kind: JOB_KINDS.AI_FILL, projectId: bulkProjectId },
    }),
  ).toBe(1)

  await expect(as('Fiona').ai.fills({ projectId: bulkProjectId })).resolves.toMatchObject([
    { id: queued.id, status: AI_FILL_STATUSES.QUEUED },
  ])

  await expect(as('Eve').ai.fills({ projectId: bulkProjectId })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })
})

test('a provider that fails stops the fill and says why, with nothing written', async () => {
  await scriptSink({ url: sink, key: FILL_KEY, steps: [{ status: 500, retryAfter: 0 }] })
  await tick()

  const [fill] = await as('Wanda').ai.fills({ projectId: bulkProjectId })

  expect(fill).toMatchObject({
    status: AI_FILL_STATUSES.PARTIAL,
    total: 23,
    filled: 0,
    reason: { code: 'PROVIDER_ERROR', message: expect.stringContaining('500') },
  })

  expect(await connection.db.drafts.count({ where: { projectId: bulkProjectId } })).toBe(0)
})

test('a key removed after the request stops the fill with that reason', async () => {
  await as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' })
  await as('Fiona').ai.removeKey({ workspaceId: fillWorkspaceId, provider: 'ANTHROPIC' })
  await tick()

  const [fill] = await as('Wanda').ai.fills({ projectId: bulkProjectId })

  expect(fill).toMatchObject({
    status: AI_FILL_STATUSES.PARTIAL,
    filled: 0,
    reason: { code: 'NO_KEY' },
  })

  await setKeyAndBudget({
    name: 'Fiona',
    workspaceId: fillWorkspaceId,
    key: FILL_KEY,
    budgetUsd: 1,
  })
})

test('the budget stops a fill after the batches it paid for, and what was written waits for review', async () => {
  await scriptSink({
    url: sink,
    key: FILL_KEY,
    steps: [{ usage: { input: 200_000, output: 40_000 } }],
  })

  await as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' })
  await tick()

  const [fill] = await as('Wanda').ai.fills({ projectId: bulkProjectId })

  expect(fill).toMatchObject({
    status: AI_FILL_STATUSES.PARTIAL,
    total: 23,
    filled: 10,
    rejected: 0,
    reason: { code: 'BUDGET_REACHED' },
  })

  expect(await sinkRequests({ url: sink, key: FILL_KEY })).toHaveLength(2)

  const usage = await as('Fiona').ai.usage({ workspaceId: fillWorkspaceId })

  expect(usage).toMatchObject({
    calls: 2,
    inputTokens: 400_000,
    outputTokens: 80_000,
    remainingUsd: 0,
  })
  expect(usage.spentUsd).toBeCloseTo(1.6, 6)
  expect(usage.languages).toMatchObject([{ language: 'pl', texts: 10 }])

  const drafts = await connection.db.drafts.findMany({ where: { projectId: bulkProjectId } })

  expect(drafts).toHaveLength(10)
  expect(drafts.every(({ aiWritten }) => aiWritten)).toBe(true)
  expect(drafts.every(({ status }) => status === DRAFT_STATUSES.IN_REVIEW)).toBe(true)
  expect(drafts.every(({ authorId }) => authorId === 'user-aif-wanda')).toBe(true)

  expect(await connection.db.approvals.count({ where: { projectId: bulkProjectId } })).toBe(0)

  await expect(
    as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' }),
  ).rejects.toMatchObject({ code: 'CONFLICT', message: 'The monthly AI budget is reached' })
})

test('a new budget lets the fill finish the rest without writing anything twice', async () => {
  await as('Fiona').ai.updateSettings({
    workspaceId: fillWorkspaceId,
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-5-5',
    monthlyBudgetUsd: 50,
  })

  await scriptSink({ url: sink, key: FILL_KEY, steps: [{ usage: { input: 2000, output: 1000 } }] })

  await as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' })
  await tick()

  const [fill] = await as('Wanda').ai.fills({ projectId: bulkProjectId })

  expect(fill).toMatchObject({
    status: AI_FILL_STATUSES.DONE,
    total: 13,
    filled: 13,
    rejected: 0,
    reason: null,
  })

  expect((await sinkRequests({ url: sink, key: FILL_KEY })).length).toBe(3)

  const drafts = await connection.db.drafts.findMany({ where: { projectId: bulkProjectId } })

  expect(drafts).toHaveLength(23)
  expect(new Set(drafts.map(({ textId }) => textId)).size).toBe(23)

  const greeting = drafts.find(({ value }) => value.startsWith('[pl] Bonjour'))

  expect(greeting?.value).toBe('[pl] Bonjour {name}')

  expect(drafts.find(({ value }) => value.includes('<b>'))?.value).toBe(
    '[pl] Voir <b>{count}</b> offres',
  )
  expect(drafts.find(({ value }) => value.includes(' | '))?.value).toBe(
    '[pl] {count} lot | {count} lots',
  )

  await expect(
    as('Wanda').ai.fillMissing({ projectId: bulkProjectId, language: 'pl' }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'Nothing is missing in this language, or every missing text already has a draft',
  })

  await tick()

  expect(await connection.db.drafts.count({ where: { projectId: bulkProjectId } })).toBe(23)
  expect((await sinkRequests({ url: sink, key: FILL_KEY })).length).toBe(3)

  const queue = await as('Fiona').reviews.queue({ projectId: bulkProjectId, language: 'pl' })

  expect(queue.total).toBe(23)
  expect(
    queue.items.every((item) => item.reason === 'SENT_FOR_REVIEW' && item.draft?.aiWritten),
  ).toBe(true)

  const stats = await as('Fiona').ai.usage({ workspaceId: fillWorkspaceId })

  expect(stats.languages).toMatchObject([{ language: 'pl', texts: 23 }])
})

test('a text whose answer breaks a token twice is left out and counted, the others are written', async () => {
  const demo = await textBySource({
    name: 'Paul',
    project: mainProjectId,
    source: 'Ce lot est vendu aux enchères.',
  })

  await as('Olga').ai.updateSettings({
    workspaceId: mainWorkspaceId,
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-5-5',
    monthlyBudgetUsd: 50,
  })

  const missing = await as('Paul').texts.search({
    projectId: mainProjectId,
    state: TEXT_STATES.MISSING,
    language: 'pl',
    limit: 50,
  })

  expect(missing.items.map(({ id }) => id)).toContain(demo.id)

  await scriptSink({
    url: sink,
    key: MAIN_KEY,
    steps: [{ corrupt: [{ id: 2, mode: 'invent' }] }],
  })

  const queued = await as('Paul').ai.fillMissing({ projectId: mainProjectId, language: 'pl' })

  expect(queued.total).toBe(missing.total)
  await tick()

  const [fill] = await as('Paul').ai.fills({ projectId: mainProjectId })

  expect(fill).toMatchObject({
    status: AI_FILL_STATUSES.PARTIAL,
    total: missing.total,
    filled: missing.total - 1,
    rejected: 1,
    reason: { code: 'TEXTS_REJECTED' },
  })

  const requests = await sinkRequests({ url: sink, key: MAIN_KEY })

  expect(requests).toHaveLength(2)
  expect(JSON.parse(requests[1]?.body.messages[0].content).texts).toHaveLength(1)
  expect(JSON.parse(requests[1]?.body.messages[0].content).texts[0].previousProblems).toEqual([
    '⟦99⟧ does not exist in the source text',
  ])
})

test.skipIf(!process.env.ANTHROPIC_API_KEY)(
  'a real Anthropic call keeps the placeholder of the source',
  async () => {
    const suggestion = await realSuggestion({
      provider: 'ANTHROPIC',
      key: process.env.ANTHROPIC_API_KEY ?? '',
      slug: 'ai-real-anthropic',
    })

    expect(suggestion.value).toContain('{date}')
    expect(suggestion.failures).toEqual([])
    expect(suggestion.usage.outputTokens).toBeGreaterThan(0)
  },
)

test.skipIf(!process.env.OPENAI_API_KEY)(
  'a real OpenAI call keeps the placeholder of the source',
  async () => {
    const suggestion = await realSuggestion({
      provider: 'OPENAI',
      key: process.env.OPENAI_API_KEY ?? '',
      slug: 'ai-real-openai',
    })

    expect(suggestion.value).toContain('{date}')
    expect(suggestion.failures).toEqual([])
    expect(suggestion.usage.outputTokens).toBeGreaterThan(0)
  },
)

async function realSuggestion(options: {
  provider: 'ANTHROPIC' | 'OPENAI'
  key: string
  slug: string
}) {
  const { db } = connection
  const workspace = await db.workspaces.create({ data: { name: options.slug, slug: options.slug } })

  await addPeople({
    db,
    workspaceId: workspace.id,
    people: [
      {
        id: `user-${options.slug}`,
        name: options.slug,
        role: WORKSPACE_ROLES.OWNER,
        languages: null,
      },
    ],
    domain: 'real.test',
  })

  const project = await seedDemoProject(db, {
    workspaceId: workspace.id,
    repository: `glot/${options.slug}`,
  })

  await seedDemoRepository({ root: repositoriesRoot, repository: `glot/${options.slug}` })

  const context = await personContext(`user-${options.slug}`)

  const real: RequestContext = {
    ...context,
    ai: {
      ...context.ai,
      baseUrls: {
        ANTHROPIC: 'https://api.anthropic.com',
        OPENAI: 'https://api.openai.com',
      },
    },
  }

  await new AiSettingsService(real).setKey({
    workspaceId: workspace.id,
    provider: options.provider,
    key: options.key,
  })

  await new AiSettingsService(real).update({
    workspaceId: workspace.id,
    provider: options.provider,
    model: options.provider === 'ANTHROPIC' ? 'claude-sonnet-5-5' : 'gpt-6.2-sol',
    monthlyBudgetUsd: 1,
  })

  const { entries } = await real.catalog.read({
    ...project,
    sources: await db.projectSources.findMany({ where: { projectId: project.id } }),
  })

  const ended = entries.find(({ sourceValue }) => sourceValue === 'Fin le {date}')

  if (!ended) throw new Error('The demo has no Fin le {date}')

  return new AiService(real).suggest({
    projectId: project.id,
    textId: ended.id,
    language: 'pl',
  })
}
