import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient, createGlotRestClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const agentKey = inject('agentKey')
const demoProjectId = inject('projectId')
const LOCALES = 'packages/translations/i18n/locales'

const PEOPLE = [
  { id: 'glossary-olga', name: 'Olga', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'glossary-rita', name: 'Rita', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'glossary-dora', name: 'Dora', role: WORKSPACE_ROLES.REVIEWER, languages: ['de'] },
  { id: 'glossary-gina', name: 'Gina', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { id: 'glossary-vic', name: 'Vic', role: WORKSPACE_ROLES.VIEWER, languages: null },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
let workspaceId = ''
let projectId = ''
let repository = ''

function as(name: string) {
  const client = clients.get(name)

  if (!client) throw new Error(`${name} is not signed in`)

  return client
}

function words(options: { term: string; plural?: string | null; avoid?: string[] }) {
  return { term: options.term, plural: options.plural ?? null, avoid: options.avoid ?? [] }
}

async function textBySource(options: { name: string; source: string }) {
  const page = await as(options.name).texts.search({ projectId, q: options.source })
  const text = page.items.find((item) => item.source.value === options.source)

  if (!text) throw new Error(`No text reads ${options.source}`)

  return text
}

async function translationIn(options: { source: string; language: string }) {
  const text = await textBySource({ name: 'Olga', source: options.source })
  const found = text.translations.find((item) => item.language === options.language)

  if (!found) throw new Error(`No ${options.language} translation of ${options.source}`)

  return found
}

async function validated(options: {
  name: string
  neverTranslate?: boolean
  terms: Record<string, ReturnType<typeof words>>
}) {
  const created = await as('Olga').glossary.createConcept({
    workspaceId,
    name: options.name,
    neverTranslate: options.neverTranslate ?? false,
    terms: options.terms,
  })

  return as('Olga').glossary.setConceptStatus({ conceptId: created.id, status: 'VALIDATED' })
}

async function commitMessages(options: { edits: Record<string, string> }) {
  for (const [language, value] of Object.entries(options.edits)) {
    const file = join(repository, LOCALES, `${language}.json`)
    const content = await readFile(file, 'utf8')
    const messages: Record<string, Record<string, string>> = JSON.parse(content)

    messages.brand = { welcome: value }
    await writeFile(file, JSON.stringify(messages, null, 2))
  }

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
    'Add a brand text',
  ])
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Glossary', slug: 'glossary' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@glossary.test`,
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
    repository: 'glot/glossary',
  })

  await connection.close()
  workspaceId = workspace.id
  projectId = project.id

  const seeded = await seedDemoRepository({
    root: inject('repositoriesRoot'),
    repository: 'glot/glossary',
  })

  repository = seeded.directory

  for (const person of PEOPLE) {
    const cookie = await signInByMagicLink(`${person.name.toLowerCase()}@glossary.test`)

    clients.set(person.name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }
})

test('a suggested concept checks nothing, validating it marks the texts that use its avoided words', async () => {
  const before = await translationIn({ source: 'Ce lot est vendu aux enchères.', language: 'de' })

  expect(before).toMatchObject({ state: 'TO_CHECK', failures: [] })

  const suggested = await as('Olga').glossary.createConcept({
    workspaceId,
    name: 'lot',
    definition: 'An item sold at auction, never a plot of land.',
    terms: {
      de: words({ term: 'Los', plural: 'Lose', avoid: ['Grundstück', 'Grundstück', 'Charge'] }),
      pl: words({ term: 'partia', plural: 'partie', avoid: ['działka'] }),
      nl: words({ term: 'kavel', plural: 'kavels', avoid: ['perceel'] }),
    },
  })

  expect(suggested).toMatchObject({
    status: 'SUGGESTED',
    neverTranslate: false,
    terms: { de: { avoid: ['Grundstück', 'Charge'] } },
  })

  const stillSuggested = await translationIn({
    source: 'Ce lot est vendu aux enchères.',
    language: 'de',
  })

  expect(stillSuggested).toMatchObject({ state: 'TO_CHECK', failures: [] })

  await as('Olga').glossary.setConceptStatus({ conceptId: suggested.id, status: 'VALIDATED' })

  const marked = await translationIn({ source: 'Ce lot est vendu aux enchères.', language: 'de' })

  expect(marked).toMatchObject({
    state: 'NEEDS_FIX',
    failures: [
      { code: 'AVOID_WORDS', message: 'Avoid “Grundstück”: the glossary asks for another word.' },
    ],
  })

  const dutch = await translationIn({ source: 'Ce lot est vendu aux enchères.', language: 'nl' })

  expect(dutch).toMatchObject({ state: 'TO_CHECK', failures: [] })
})

test('adding an avoided word to a validated concept marks the texts using it, and only that language', async () => {
  const outbid = await validated({
    name: 'outbid',
    terms: { de: words({ term: 'Überboten' }), pl: words({ term: 'Oferta przebita' }) },
  })

  await expect(
    translationIn({ source: 'Enchère dépassée', language: 'de' }),
  ).resolves.toMatchObject({ failures: [] })

  await as('Olga').glossary.updateConcept({
    conceptId: outbid.id,
    name: outbid.name,
    definition: outbid.definition,
    neverTranslate: outbid.neverTranslate,
    notes: outbid.notes,
    terms: {
      de: words({ term: 'Überboten', avoid: ['überboten'] }),
      pl: outbid.terms.pl ?? words({ term: 'Oferta przebita' }),
    },
  })

  await expect(
    translationIn({ source: 'Enchère dépassée', language: 'de' }),
  ).resolves.toMatchObject({
    state: 'NEEDS_FIX',
    failures: [
      { code: 'AVOID_WORDS', message: 'Avoid “überboten”: the glossary asks for another word.' },
    ],
  })

  await expect(
    translationIn({ source: 'Enchère dépassée', language: 'pl' }),
  ).resolves.toMatchObject({ failures: [] })
})

test('turning a term down removes the warning, validating it again brings it back', async () => {
  const concepts = await as('Olga').glossary.listConcepts({ workspaceId })
  const outbid = concepts.find(({ name }) => name === 'outbid')

  if (!outbid) throw new Error('The outbid concept is missing')

  const turnedDown = await as('Olga').glossary.setConceptStatus({
    conceptId: outbid.id,
    status: 'TURNED_DOWN',
  })

  expect(turnedDown.status).toBe('TURNED_DOWN')

  await expect(
    translationIn({ source: 'Enchère dépassée', language: 'de' }),
  ).resolves.toMatchObject({ state: 'TO_CHECK', failures: [] })

  await as('Olga').glossary.setConceptStatus({ conceptId: outbid.id, status: 'VALIDATED' })

  await expect(
    translationIn({ source: 'Enchère dépassée', language: 'de' }),
  ).resolves.toMatchObject({ state: 'NEEDS_FIX' })

  await as('Olga').glossary.setConceptStatus({ conceptId: outbid.id, status: 'TURNED_DOWN' })
})

test('a draft that uses an avoided word fails its check and cannot be sent', async () => {
  const text = await textBySource({ name: 'Gina', source: 'Ce lot est vendu aux enchères.' })

  const draft = await as('Gina').drafts.save({
    projectId,
    textId: text.id,
    language: 'pl',
    value: 'Ta działka jest sprzedawana na aukcji.',
  })

  expect(draft.failures).toEqual([
    { code: 'AVOID_WORDS', message: 'Avoid “działka”: the glossary asks for another word.' },
  ])

  await expect(as('Gina').drafts.send({ projectId, draftId: draft.id })).rejects.toMatchObject({
    code: 'CONFLICT',
  })

  const fixed = await as('Gina').drafts.save({
    projectId,
    textId: text.id,
    language: 'pl',
    value: 'Ta partia jest sprzedawana na aukcji.',
  })

  expect(fixed.failures).toEqual([])
})

test('a never-translated word of the source must stay in the target text', async () => {
  await commitMessages({
    edits: { fr: 'Bienvenue sur Agorastore', de: 'Willkommen im Shop', pl: 'Witamy w Agorastore' },
  })

  await as('Olga').projects.sync({ projectId })

  await expect(
    translationIn({ source: 'Bienvenue sur Agorastore', language: 'de' }),
  ).resolves.toMatchObject({ state: 'TO_CHECK', failures: [] })

  const brand = await validated({
    name: 'Agorastore',
    neverTranslate: true,
    terms: { fr: words({ term: 'Agorastore' }) },
  })

  await expect(
    translationIn({ source: 'Bienvenue sur Agorastore', language: 'de' }),
  ).resolves.toMatchObject({
    state: 'NEEDS_FIX',
    failures: [
      {
        code: 'NEVER_TRANSLATE',
        message: 'Keep “Agorastore” as it is: the glossary says it is never translated.',
      },
    ],
  })

  await expect(
    translationIn({ source: 'Bienvenue sur Agorastore', language: 'pl' }),
  ).resolves.toMatchObject({ failures: [] })

  await as('Olga').glossary.setConceptStatus({ conceptId: brand.id, status: 'TURNED_DOWN' })

  await expect(
    translationIn({ source: 'Bienvenue sur Agorastore', language: 'de' }),
  ).resolves.toMatchObject({ state: 'TO_CHECK', failures: [] })
})

test('owners edit every language, reviewers the languages they review, writers and viewers read', async () => {
  const polish = await as('Rita').glossary.createConcept({
    workspaceId,
    name: 'seller',
    terms: { pl: words({ term: 'sprzedawca' }) },
  })

  expect(polish.status).toBe('SUGGESTED')

  await expect(
    as('Rita').glossary.createConcept({
      workspaceId,
      name: 'buyer',
      terms: { pl: words({ term: 'kupujący' }), de: words({ term: 'Käufer' }) },
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Gina').glossary.createConcept({
      workspaceId,
      name: 'auctioneer',
      terms: { pl: words({ term: 'licytator' }) },
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(as('Vic').glossary.listConcepts({ workspaceId })).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'seller' })]),
  )

  const validatedPolish = await as('Rita').glossary.setConceptStatus({
    conceptId: polish.id,
    status: 'VALIDATED',
  })

  expect(validatedPolish.status).toBe('VALIDATED')

  const shared = await as('Olga').glossary.createConcept({
    workspaceId,
    name: 'buyer',
    terms: { pl: words({ term: 'kupujący' }), de: words({ term: 'Käufer' }) },
  })

  await expect(
    as('Rita').glossary.setConceptStatus({ conceptId: shared.id, status: 'VALIDATED' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const ownLanguage = await as('Rita').glossary.updateConcept({
    conceptId: shared.id,
    name: shared.name,
    definition: shared.definition,
    neverTranslate: shared.neverTranslate,
    notes: shared.notes,
    terms: { pl: words({ term: 'nabywca' }), de: words({ term: 'Käufer' }) },
  })

  expect(ownLanguage.terms.pl?.term).toBe('nabywca')

  await expect(
    as('Rita').glossary.updateConcept({
      conceptId: shared.id,
      name: shared.name,
      definition: 'Whoever wins the lot.',
      neverTranslate: shared.neverTranslate,
      notes: shared.notes,
      terms: { pl: words({ term: 'nabywca' }), de: words({ term: 'Käufer' }) },
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    as('Rita').glossary.updateConcept({
      conceptId: shared.id,
      name: shared.name,
      definition: shared.definition,
      neverTranslate: shared.neverTranslate,
      notes: shared.notes,
      terms: { pl: words({ term: 'nabywca' }), de: words({ term: 'Kunde' }) },
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const reworded = await as('Rita').glossary.updateConcept({
    conceptId: polish.id,
    name: polish.name,
    definition: polish.definition,
    neverTranslate: polish.neverTranslate,
    notes: polish.notes,
    terms: { pl: words({ term: 'sprzedający', plural: 'sprzedający' }) },
  })

  expect(reworded.terms.pl).toEqual(words({ term: 'sprzedający', plural: 'sprzedający' }))

  await expect(as('Dora').glossary.removeConcept({ conceptId: shared.id })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  })

  await expect(as('Olga').glossary.removeConcept({ conceptId: shared.id })).resolves.toEqual({
    removed: true,
  })

  const names = (await as('Olga').glossary.listConcepts({ workspaceId })).map(({ name }) => name)

  expect(names).not.toContain('buyer')
})

test('a concept name is unique in a workspace whatever its case, and a stranger sees nothing', async () => {
  await expect(
    as('Olga').glossary.createConcept({
      workspaceId,
      name: 'LOT',
      terms: { de: words({ term: 'Los' }) },
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' })

  const annaCookie = await signInByMagicLink('anna@glot.test')
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(annaCookie) })

  await expect(anna.glossary.listConcepts({ workspaceId })).rejects.toMatchObject({
    code: 'NOT_FOUND',
  })

  await expect(anna.glossary.list({ projectId })).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('the pull API returns the validated terms of the project workspace and nothing else', async () => {
  const pulled = await as('Dora').glossary.list({ projectId })

  expect(pulled.map(({ name }) => name).toSorted()).toEqual(['lot', 'seller'])
  expect(pulled.every(({ status }) => status === 'VALIDATED')).toBe(true)

  const polish = await as('Dora').glossary.list({ projectId, language: 'pl' })

  expect(polish.map(({ name }) => name).toSorted()).toEqual(['lot', 'seller'])

  const german = await as('Dora').glossary.list({ projectId, language: 'de' })

  expect(german.map(({ name }) => name)).toEqual(['lot'])
})

test('the seeded demo glossary: the pull API with a key lists validated concepts, never translated ones in every language', async () => {
  const agent = createGlotRestClient({ url: baseUrl, token: agentKey })
  const pulled = await agent.glossary.list({ projectId: demoProjectId })

  expect(pulled.map(({ name }) => name).toSorted()).toEqual(['Agorastore', 'bid', 'lot'])

  const lot = pulled.find(({ name }) => name === 'lot')

  expect(lot).toMatchObject({
    status: 'VALIDATED',
    terms: {
      de: { term: 'Los', plural: 'Lose', avoid: ['Grundstück', 'Charge'] },
      pl: { term: 'partia', plural: 'partie', avoid: ['działka'] },
      nl: { term: 'kavel', plural: 'kavels', avoid: ['perceel'] },
    },
  })

  const dutch = await agent.glossary.list({ projectId: demoProjectId, language: 'nl' })

  expect(dutch.map(({ name }) => name).toSorted()).toEqual(['Agorastore', 'bid', 'lot'])

  const german = await agent.glossary.list({ projectId: demoProjectId, language: 'it' })

  expect(german.map(({ name }) => name)).toEqual(['Agorastore'])
})

test('an agent key suggests a concept but a person validates, changes or removes it', async () => {
  const agent = createGlotClient({ url: baseUrl, token: agentKey })
  const annaCookie = await signInByMagicLink('anna@glot.test')
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(annaCookie) })
  const demo = (await agent.projects.list()).find((project) => project.name === 'Demo apps')

  if (!demo) throw new Error('The demo project is missing')

  const suggested = await agent.glossary.createConcept({
    workspaceId: demo.workspaceId,
    name: 'starting price',
    terms: { pl: words({ term: 'cena wywoławcza' }) },
  })

  expect(suggested.status).toBe('SUGGESTED')

  await expect(
    agent.glossary.setConceptStatus({ conceptId: suggested.id, status: 'VALIDATED' }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  await expect(agent.glossary.removeConcept({ conceptId: suggested.id })).rejects.toMatchObject({
    code: 'PEOPLE_ONLY',
  })

  const refused = await fetch(`${baseUrl}/api/v1/glossary/${suggested.id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${agentKey}` },
  })

  expect(refused.status).toBe(403)

  await expect(anna.glossary.removeConcept({ conceptId: suggested.id })).resolves.toEqual({
    removed: true,
  })

  const listed = await anna.glossary.listConcepts({ workspaceId: demo.workspaceId })

  expect(listed.map(({ name }) => name).toSorted()).toEqual([
    'Agorastore',
    'bid',
    'lot',
    'reserve price',
  ])

  expect(listed.find(({ name }) => name === 'reserve price')?.status).toBe('SUGGESTED')
})

test('the glossary is in the OpenAPI document and the MCP tools, without the deciding procedures', async () => {
  const spec = await fetch(`${baseUrl}/api/v1/openapi.json`).then((response) => response.json())

  expect(Object.keys(spec.paths)).toEqual(
    expect.arrayContaining([
      '/projects/{projectId}/glossary',
      '/workspaces/{workspaceId}/glossary',
      '/glossary/{conceptId}',
      '/glossary/{conceptId}/status',
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
    expect.arrayContaining(['listGlossary', 'listGlossaryConcepts', 'suggestGlossaryConcept']),
  )

  for (const deciding of [
    'updateGlossaryConcept',
    'setGlossaryConceptStatus',
    'removeGlossaryConcept',
  ]) {
    expect(names).not.toContain(deciding)
  }
})
