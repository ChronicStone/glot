import { createGlotClient, createGlotRestClient } from '@glot/sdk'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
const projectId = inject('projectId')
const agentKey = inject('agentKey')
let sessionCookie = ''

beforeAll(async () => {
  sessionCookie = await signInByMagicLink('anna@glot.test')
})

async function textIdOf(options: { glot: ReturnType<typeof createGlotClient>; source: string }) {
  const page = await options.glot.texts.search({ projectId, q: options.source })
  const text = page.items.find((item) => item.source.value === options.source)

  if (!text) throw new Error(`No text reads ${options.source}`)

  return text.id
}

test('a signed-in person reads the Polish texts that need a fix', async () => {
  const glot = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
  const page = await glot.texts.search({ projectId, state: 'NEEDS_FIX', language: 'pl' })
  expect(page.items.map((text) => text.source.value)).toEqual(['Fin le {date}'])
})

test('projects list with their apps through the public REST API and an agent key', async () => {
  const glot = createGlotRestClient({ url: baseUrl, token: agentKey })
  const projects = await glot.projects.list()
  const demo = projects.find((project) => project.name === 'Demo apps')

  expect(demo?.apps.map((app) => app.name).toSorted()).toEqual(['Admin', 'Market'])
})

test('an agent key cannot approve, a signed-in person can', async () => {
  const agent = createGlotClient({ url: baseUrl, token: agentKey })
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
  const textId = await textIdOf({ glot: anna, source: 'Enchère dépassée' })

  await expect(agent.reviews.approve({ projectId, textId, language: 'de' })).rejects.toMatchObject({
    code: 'PEOPLE_ONLY',
  })

  const text = await anna.reviews.approve({ projectId, textId, language: 'de' })

  expect(text.translations.find((t) => t.language === 'de')).toMatchObject({
    state: 'REVIEWED',
    reviewedBy: 'user-anna',
  })
})

test('approving through the public REST API with a key is refused with 403', async () => {
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
  const textId = await textIdOf({ glot: anna, source: 'Enchère dépassée' })

  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}/reviews`, {
    method: 'POST',
    headers: { authorization: `Bearer ${agentKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ textId, language: 'nl' }),
  })

  expect(response.status).toBe(403)
})

test('only an owner creates a workspace, and better-auth member endpoints are closed', async () => {
  const marieCookie = await signInByMagicLink('marie@glot.test')

  async function call(options: { cookie: string; path: string; body: unknown }) {
    return fetch(`${baseUrl}/api/auth${options.path}`, {
      method: 'POST',
      headers: { cookie: options.cookie, origin: baseUrl, 'content-type': 'application/json' },
      body: JSON.stringify(options.body),
    })
  }

  const refused = await call({
    cookie: sessionCookie,
    path: '/organization/create',
    body: { name: 'Reviewer space', slug: 'reviewer-space' },
  })

  expect(refused.status).toBe(403)

  const created = await call({
    cookie: marieCookie,
    path: '/organization/create',
    body: { name: 'Second workspace', slug: 'second-workspace' },
  }).then((response) => response.json())

  expect(created.id).toMatch(/^[0-9a-f-]{36}$/u)

  const invited = await call({
    cookie: marieCookie,
    path: '/organization/invite-member',
    body: { email: 'writer@glot.test', role: 'writer', organizationId: created.id },
  })

  expect(invited.status).toBe(404)
})

test('a draft is saved for its author', async () => {
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })

  const draft = await anna.drafts.save({
    projectId,
    textId: await textIdOf({ glot: anna, source: 'Enregistrer' }),
    language: 'pl',
    value: 'Zapisz',
  })

  expect(draft).toMatchObject({ authorId: 'user-anna', status: 'DRAFT', value: 'Zapisz' })
})

test('calls without a session or key are refused', async () => {
  const response = await fetch(`${baseUrl}/api/v1/projects`)
  expect(response.status).toBe(401)
})

test('the OpenAPI document and its reference page are public', async () => {
  const spec = await fetch(`${baseUrl}/api/v1/openapi.json`).then((r) => r.json())
  expect(Object.keys(spec.paths)).toContain('/projects/{projectId}/texts')
  const docs = await fetch(`${baseUrl}/api/v1/docs`)
  expect(docs.headers.get('content-type')).toContain('text/html')
})

test('MCP offers every procedure except approving', async () => {
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

  const body = await response.json()
  const names = body.result.tools.map((tool: { name: string }) => tool.name)
  expect(names).toContain('searchTexts')
  expect(names).not.toContain('approveText')
})

test('texts are found by their key as well as by their words', async () => {
  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
  const page = await anna.texts.search({ projectId, q: 'actions.save' })

  expect(page.items.map((text) => text.key.path.join('.'))).toContain('actions.save')
  expect(page.items.every((text) => text.key.path.join('.').includes('actions.save'))).toBe(true)
})
