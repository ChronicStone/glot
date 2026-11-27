import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { PREVIEW_DEMO_SOURCES } from '@glot/preview-demo/constants'
import { startPreviewDemo } from '@glot/preview-demo'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { afterAll, beforeAll, expect, inject, test } from 'vite-plus/test'
import { PreviewAdapterService } from '../server/domains/templates/services/preview-adapter.service.ts'
import { startHostileAdapter } from './support/hostile-adapter.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')

const PEOPLE = [
  { id: 'user-tess', name: 'Tess', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'user-wim', name: 'Wim', role: WORKSPACE_ROLES.WRITER, languages: ['de'] },
]

const clients = new Map<string, ReturnType<typeof createGlotClient>>()
const tests: string[] = []
let adapter: Awaited<ReturnType<typeof startPreviewDemo>> | null = null
let projectId = ''
let bareProjectId = ''

function as(name: string) {
  const client = clients.get(name)

  if (!client) throw new Error(`${name} is not signed in`)

  return client
}

function keyOf(text: { key: { source: string; path: string[] } }) {
  return `${text.key.source} ${text.key.path.join('.')}`
}

beforeAll(async () => {
  adapter = await startPreviewDemo({ port: 0, onTest: (line) => tests.push(line) })

  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Templates', slug: 'templates' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@templates.test`,
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
    repository: 'glot/templates',
    previewUrl: adapter.url,
  })

  const bare = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: 'glot/templates-bare',
  })

  await connection.close()
  projectId = project.id
  bareProjectId = bare.id

  await seedDemoRepository({
    root: inject('repositoriesRoot'),
    repository: 'glot/templates',
    withEmails: true,
  })

  await seedDemoRepository({ root: inject('repositoriesRoot'), repository: 'glot/templates-bare' })

  for (const person of PEOPLE) {
    const cookie = await signInByMagicLink(`${person.name.toLowerCase()}@templates.test`)

    clients.set(person.name, createGlotClient({ url: baseUrl, fetch: withCookie(cookie) }))
  }
})

afterAll(async () => {
  await adapter?.close()
})

test('the adapter lists the brands and templates, each with its texts and their worst state', async () => {
  const list = await as('Tess').templates.list({ projectId })

  expect(list).toMatchObject({
    available: true,
    sendTest: true,
    brands: [
      { id: 'agorastore', name: 'Agorastore' },
      { id: 'immo', name: 'Agorastore Immo' },
    ],
  })

  expect(list.templates).toEqual([
    { id: 'outbid', name: 'Outbid', group: 'Bidding', kind: 'email', texts: 7, state: 'MISSING' },
    { id: 'lot-won', name: 'Lot won', group: 'Bidding', kind: 'email', texts: 7, state: 'MISSING' },
    {
      id: 'invoice',
      name: 'Invoice',
      group: 'Documents',
      kind: 'document',
      texts: 5,
      state: 'MISSING',
    },
    { id: 'outbid-sms', name: 'Outbid SMS', group: 'SMS', kind: 'sms', texts: 1, state: 'MISSING' },
  ])
})

test("a brand's texts come from its own source first, then its parent brand, then the shared texts", async () => {
  const immo = await as('Tess').templates.texts({ projectId, templateId: 'outbid', brand: 'immo' })

  const agorastore = await as('Tess').templates.texts({
    projectId,
    templateId: 'outbid',
    brand: 'agorastore',
  })

  expect(immo.items.map(keyOf)).toEqual([
    `${PREVIEW_DEMO_SOURCES.AGORASTORE.name} outbid.subject`,
    `${PREVIEW_DEMO_SOURCES.AGORASTORE.name} outbid.greeting`,
    `${PREVIEW_DEMO_SOURCES.IMMO.name} outbid.body`,
    `${PREVIEW_DEMO_SOURCES.AGORASTORE.name} outbid.ending`,
    `${PREVIEW_DEMO_SOURCES.AGORASTORE.name} outbid.cta`,
    `${PREVIEW_DEMO_SOURCES.COMMON.name} footer.why`,
    `${PREVIEW_DEMO_SOURCES.COMMON.name} footer.manage`,
  ])

  expect(agorastore.items[2]).toMatchObject({
    key: { source: PREVIEW_DEMO_SOURCES.AGORASTORE.name, path: ['outbid', 'body'] },
    syntax: 'handlebars-html',
  })
})

test('a preview renders the texts with sample data, each one marked with its text id', async () => {
  const texts = await as('Tess').templates.texts({ projectId, templateId: 'outbid', brand: 'immo' })
  const body = texts.items[2]

  const preview = await as('Tess').templates.preview({
    projectId,
    templateId: 'outbid',
    brand: 'immo',
    language: 'fr',
  })

  expect(preview).toMatchObject({
    kind: 'email',
    subject: 'Vous avez été surenchéri sur « Renault Kangoo 2017 »',
    from: 'Agorastore Immo <encheres@immo.agorastore.fr>',
    text: null,
  })

  expect(preview.html).toContain(
    `<span data-glot-text="${body?.id}">Votre offre de 1 250 € sur le bien « Renault Kangoo 2017 » a été dépassée.</span>`,
  )
})

test('editing a sentence updates the preview: a draft shows at once, and so does what is being typed', async () => {
  const texts = await as('Wim').templates.texts({
    projectId,
    templateId: 'outbid',
    brand: 'agorastore',
  })

  const ending = texts.items[3]

  if (!ending) throw new Error('No ending text')

  await as('Wim').drafts.save({
    projectId,
    textId: ending.id,
    language: 'de',
    value: 'Die Auktion endet am {{date}}. Bieten Sie jetzt.',
  })

  const drafted = await as('Wim').templates.preview({
    projectId,
    templateId: 'outbid',
    brand: 'agorastore',
    language: 'de',
  })

  expect(drafted.html).toContain('Die Auktion endet am 28. November um 14 Uhr. Bieten Sie jetzt.')

  const typing = await as('Wim').templates.preview({
    projectId,
    templateId: 'outbid',
    brand: 'agorastore',
    language: 'de',
    overrides: [{ textId: ending.id, value: 'Noch bis {{date}}.' }],
  })

  expect(typing.html).toContain('Noch bis 28. November um 14 Uhr.')
})

test('a writer changing a link is refused: the markup and links must match the source text', async () => {
  const texts = await as('Wim').templates.texts({
    projectId,
    templateId: 'outbid',
    brand: 'agorastore',
  })

  const manage = texts.items.find((text) => text.key.path.join('.') === 'footer.manage')

  if (!manage) throw new Error('No footer.manage text')

  expect(manage.translations.find(({ language }) => language === 'de')).toMatchObject({
    state: 'NEEDS_FIX',
    failures: [{ code: 'MARKUP' }, { code: 'LINKS' }],
  })

  const draft = await as('Wim').drafts.save({
    projectId,
    textId: manage.id,
    language: 'de',
    value: 'Meine <a href="https://example.com/abmelden">Benachrichtigungen</a> verwalten',
  })

  expect(draft.failures.map(({ code }) => code)).toEqual(['MARKUP'])

  await expect(as('Wim').drafts.send({ projectId, draftId: draft.id })).rejects.toMatchObject({
    code: 'CONFLICT',
  })

  const fixed = await as('Wim').drafts.save({
    projectId,
    textId: manage.id,
    language: 'de',
    value:
      'Meine <a href="https://agorastore.fr/compte/notifications">Benachrichtigungen</a> verwalten',
  })

  expect(fixed.failures).toEqual([])
  await expect(as('Wim').drafts.send({ projectId, draftId: fixed.id })).resolves.toMatchObject({
    status: 'IN_REVIEW',
  })
})

test('an SMS renders as text, with its placeholders filled', async () => {
  const sms = await as('Tess').templates.preview({
    projectId,
    templateId: 'outbid-sms',
    brand: 'agorastore',
    language: 'fr',
  })

  expect(sms).toEqual({
    kind: 'sms',
    subject: null,
    from: 'AGORASTORE',
    html: null,
    text: 'Agorastore : votre offre sur « Renault Kangoo 2017 » a été dépassée. L’enchère se termine le 28 novembre à 14 h. Enchérir : agst.re/48213',
  })
})

test('a test is sent to the person who asks, through the adapter', async () => {
  await expect(
    as('Wim').templates.sendTest({
      projectId,
      templateId: 'outbid',
      brand: 'agorastore',
      language: 'de',
    }),
  ).resolves.toEqual({ to: 'wim@templates.test' })

  expect(tests).toEqual([
    'Test of outbid (agorastore, de) to wim@templates.test: Sie wurden bei „Renault Kangoo 2017“ überboten',
  ])
})

test('unknown templates, brands and languages are not found', async () => {
  await expect(
    as('Tess').templates.texts({ projectId, templateId: 'nope', brand: 'agorastore' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await expect(
    as('Tess').templates.preview({
      projectId,
      templateId: 'outbid',
      brand: 'nope',
      language: 'fr',
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await expect(
    as('Tess').templates.preview({
      projectId,
      templateId: 'outbid',
      brand: 'agorastore',
      language: 'it',
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('a preview adapter address with a query, a fragment or credentials is refused', async () => {
  const [project] = (await as('Tess').projects.list()).filter(({ id }) => id === projectId)

  if (!project) throw new Error('No project')

  for (const previewUrl of [
    'http://localhost:9/?x=1',
    'http://localhost:9/#x',
    'http://glot:secret@localhost:9/',
  ]) {
    await expect(
      as('Tess').projects.update({
        projectId,
        name: project.name,
        defaultBranch: 'main',
        sourceLanguage: project.sourceLanguage,
        languages: project.languages,
        sources: project.sources,
        previewUrl,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  }
})

test('a project without a preview adapter says so', async () => {
  await expect(as('Tess').templates.list({ projectId: bareProjectId })).rejects.toMatchObject({
    code: 'CONFLICT',
  })
})

test('an adapter that redirects, answers too much or drips its answer is unavailable, never followed or waited on', async () => {
  const hostile = await startHostileAdapter({ redirectTo: adapter?.url ?? '' })
  const previews = new PreviewAdapterService({ timeoutMs: 1000 })

  try {
    for (const behaviour of ['redirect', 'huge', 'drip'] as const) {
      const started = Date.now()

      await expect(previews.catalog(hostile.url(behaviour))).rejects.toMatchObject({
        code: 'BAD_GATEWAY',
      })

      expect(Date.now() - started).toBeLessThan(3000)
    }
  } finally {
    await hostile.close()
  }
})

test('when the adapter stops answering, the last list stays and previews fail as unavailable', async () => {
  await adapter?.close()
  adapter = null

  await expect(as('Tess').templates.list({ projectId })).resolves.toMatchObject({
    available: false,
    templates: [{ id: 'outbid' }, { id: 'lot-won' }, { id: 'invoice' }, { id: 'outbid-sms' }],
  })

  await expect(
    as('Tess').templates.preview({
      projectId,
      templateId: 'outbid',
      brand: 'agorastore',
      language: 'fr',
    }),
  ).rejects.toMatchObject({ code: 'BAD_GATEWAY' })
})
