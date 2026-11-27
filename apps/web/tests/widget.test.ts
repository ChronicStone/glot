import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { WIDGET_TEST_ORIGINS } from './fixtures/widget.fixtures.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
const REPOSITORY = 'glot/widget'
const OTHER_REPOSITORY = 'glot/widget-other'
const SAVE_KEY = 'actions.save'
const OUTBID_KEY = 'marketplace.itemCard.outbid'

const PEOPLE = [
  { id: 'user-wanda', name: 'Wanda', role: WORKSPACE_ROLES.WRITER, languages: ['pl'], ends: false },
  { id: 'user-xena', name: 'Xena', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'], ends: true },
]

const cookies = new Map<string, string>()
let projectId = ''
let otherProjectId = ''

function glot(name: string) {
  const cookie = cookies.get(name)

  if (!cookie) throw new Error(`${name} is not signed in`)

  return createGlotClient({ url: baseUrl, fetch: withCookie(cookie) })
}

function widget(options: { token: string; origin: string }) {
  return createGlotClient({
    url: baseUrl,
    path: '/widget/rpc',
    token: options.token,
    fetch: (input, init) => {
      const headers = new Headers(init?.headers)
      headers.set('origin', options.origin)

      return fetch(input, { ...init, headers })
    },
  })
}

function signWidgetIn(options: { name: string; origin: string; repository?: string }) {
  return glot(options.name).widget.token({
    origin: options.origin,
    repository: options.repository ?? REPOSITORY,
  })
}

function postWidget(options: { token: string; origin: string; path: string; body: unknown }) {
  return fetch(`${baseUrl}/widget/rpc/${options.path}`, {
    method: 'POST',
    headers: {
      origin: options.origin,
      authorization: `Bearer ${options.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ json: options.body }),
  })
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })
  const workspace = await connection.db.workspaces.create({
    data: { name: 'Widget', slug: 'widget' },
  })
  const elsewhere = await connection.db.workspaces.create({
    data: { name: 'Elsewhere', slug: 'elsewhere' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@widget.test`,
        emailVerified: true,
      },
    })

    await connection.db.workspaceMemberships.create({
      data: {
        workspaceId: workspace.id,
        userId: person.id,
        role: person.role,
        languages: person.languages,
        expiresAt: person.ends ? new Date(Date.now() + 86_400_000) : null,
      },
    })
  }

  await connection.db.user.create({
    data: { id: 'user-olga', name: 'Olga', email: 'olga@widget.test', emailVerified: true },
  })

  await connection.db.workspaceMemberships.create({
    data: { workspaceId: elsewhere.id, userId: 'user-olga', role: WORKSPACE_ROLES.OWNER },
  })

  const project = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: REPOSITORY,
  })

  const other = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: OTHER_REPOSITORY,
  })

  await connection.close()
  projectId = project.id
  otherProjectId = other.id

  for (const repository of [REPOSITORY, OTHER_REPOSITORY]) {
    await seedDemoRepository({ root: inject('repositoriesRoot'), repository })
  }

  for (const name of ['Wanda', 'Xena', 'Olga']) {
    cookies.set(name, await signInByMagicLink(`${name.toLowerCase()}@widget.test`))
  }
})

test('a member signs the widget in for an allowed origin and gets the project and their languages', async () => {
  const session = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UAT })

  expect(session.project).toMatchObject({
    id: projectId,
    repository: REPOSITORY,
    sourceLanguage: 'fr',
  })
  expect(session.member).toMatchObject({ id: 'user-wanda', name: 'Wanda' })
  expect(session.languages).toEqual(['pl'])
  expect(session.expiresAt.getTime() - Date.now()).toBeGreaterThan(3_500_000)
  expect(session.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(3_600_000)
})

test('the widget reads the texts of the page by their keys, with their states, through CORS', async () => {
  const { token } = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UAT })

  const preflight = await fetch(`${baseUrl}/widget/rpc/texts/byKeys`, {
    method: 'OPTIONS',
    headers: { origin: WIDGET_TEST_ORIGINS.UAT, 'access-control-request-method': 'POST' },
  })

  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('access-control-allow-origin')).toBe(WIDGET_TEST_ORIGINS.UAT)
  expect(preflight.headers.get('access-control-allow-headers')).toContain('authorization')

  const response = await postWidget({
    token,
    origin: WIDGET_TEST_ORIGINS.UAT,
    path: 'texts/byKeys',
    body: { projectId, keys: [SAVE_KEY, OUTBID_KEY, 'not.a.key'] },
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('access-control-allow-origin')).toBe(WIDGET_TEST_ORIGINS.UAT)

  const { items } = await widget({ token, origin: WIDGET_TEST_ORIGINS.UAT }).texts.byKeys({
    projectId,
    keys: [SAVE_KEY, OUTBID_KEY, 'not.a.key'],
  })

  expect(items.map((text) => text.key.path.join('.')).toSorted()).toEqual([SAVE_KEY, OUTBID_KEY])

  const save = items.find((text) => text.key.path.join('.') === SAVE_KEY)

  expect(save?.translations.find((t) => t.language === 'pl')).toMatchObject({
    value: 'Ratować',
    state: 'TO_CHECK',
  })
})

test('a draft saved from the widget is found in Glot by its author only', async () => {
  const { token } = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UAT })
  const client = widget({ token, origin: WIDGET_TEST_ORIGINS.UAT })
  const [save] = (await client.texts.byKeys({ projectId, keys: [SAVE_KEY] })).items

  if (!save) throw new Error('No save text')

  const draft = await client.drafts.save({
    projectId,
    textId: save.id,
    language: 'pl',
    value: 'Zapisz',
  })

  const seen = await glot('Wanda').texts.get({ projectId, textId: save.id })

  expect(seen.translations.find((t) => t.language === 'pl')?.draft).toMatchObject({
    id: draft.id,
    value: 'Zapisz',
    authorName: 'Wanda',
  })

  const other = await glot('Xena').texts.get({ projectId, textId: save.id })

  expect(other.translations.find((t) => t.language === 'pl')?.draft).toBeNull()

  await client.drafts.withdraw({ projectId, draftId: draft.id })
})

test('a person outside the workspace gets no widget token', async () => {
  await expect(
    signWidgetIn({ name: 'Olga', origin: WIDGET_TEST_ORIGINS.UAT }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('an API key cannot sign a widget in', async () => {
  const agent = createGlotClient({ url: baseUrl, token: inject('agentKey') })

  await expect(
    agent.widget.token({ origin: WIDGET_TEST_ORIGINS.UAT, repository: 'glot/demo' }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })
})

test('an origin the server does not list is refused, for the token and for the surface', async () => {
  await expect(
    signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UNKNOWN }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const { token } = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UAT })

  const response = await postWidget({
    token,
    origin: WIDGET_TEST_ORIGINS.UNKNOWN,
    path: 'texts/byKeys',
    body: { projectId, keys: [SAVE_KEY] },
  })

  expect(response.status).toBe(403)
  expect(response.headers.get('access-control-allow-origin')).toBeNull()
})

test('a token works only from its origin, unaltered, for its project and the widget procedures', async () => {
  const { token } = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.UAT })
  const body = { projectId, keys: [SAVE_KEY] }

  const lifted = await postWidget({
    token,
    origin: WIDGET_TEST_ORIGINS.PRODUCTION,
    path: 'texts/byKeys',
    body,
  })

  expect(lifted.status).toBe(401)

  const forged = await postWidget({
    token: `${token.slice(0, -2)}xx`,
    origin: WIDGET_TEST_ORIGINS.UAT,
    path: 'texts/byKeys',
    body,
  })

  expect(forged.status).toBe(401)

  await expect(
    widget({ token, origin: WIDGET_TEST_ORIGINS.UAT }).texts.byKeys({
      projectId: otherProjectId,
      keys: [SAVE_KEY],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })

  const search = await postWidget({
    token,
    origin: WIDGET_TEST_ORIGINS.UAT,
    path: 'texts/search',
    body: { projectId },
  })

  expect(search.status).toBe(404)

  const approve = await postWidget({
    token,
    origin: WIDGET_TEST_ORIGINS.UAT,
    path: 'reviews/approve',
    body: { projectId },
  })

  expect(approve.status).toBe(404)
})

test('the widget renews its token, and signing out of Glot signs it out', async () => {
  const cookie = await signInByMagicLink('wanda@widget.test')
  const person = createGlotClient({ url: baseUrl, fetch: withCookie(cookie) })
  const first = await person.widget.token({
    origin: WIDGET_TEST_ORIGINS.UAT,
    repository: REPOSITORY,
  })
  const client = widget({ token: first.token, origin: WIDGET_TEST_ORIGINS.UAT })

  const renewed = await client.widget.token({
    origin: WIDGET_TEST_ORIGINS.UAT,
    repository: REPOSITORY,
  })

  expect(renewed.project.id).toBe(projectId)

  await expect(
    client.widget.token({ origin: WIDGET_TEST_ORIGINS.PRODUCTION, repository: REPOSITORY }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: 'POST',
    headers: { cookie, origin: baseUrl, 'content-type': 'application/json' },
    body: '{}',
  })

  const after = await postWidget({
    token: renewed.token,
    origin: WIDGET_TEST_ORIGINS.UAT,
    path: 'texts/byKeys',
    body: { projectId, keys: [SAVE_KEY] },
  })

  expect(after.status).toBe(401)
})

test('a member whose access ends is refused on production origins only', async () => {
  await expect(
    signWidgetIn({ name: 'Xena', origin: WIDGET_TEST_ORIGINS.PRODUCTION }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  const uat = await signWidgetIn({ name: 'Xena', origin: WIDGET_TEST_ORIGINS.UAT })

  expect(uat.languages).toEqual(['pl'])

  const production = await signWidgetIn({ name: 'Wanda', origin: WIDGET_TEST_ORIGINS.PRODUCTION })

  expect(production.project.id).toBe(projectId)
})

test('texts are found by the keys the app calls them with, on the API too', async () => {
  const { items } = await glot('Wanda').texts.byKeys({
    projectId,
    keys: [OUTBID_KEY, 'marketplace.itemCard'],
  })

  expect(items).toHaveLength(1)
  expect(items[0]?.key).toEqual({
    source: 'shared-base',
    path: ['marketplace', 'itemCard', 'outbid'],
  })
})
