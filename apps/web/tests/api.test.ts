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
  expect(projects.map((project) => project.name)).toEqual(['Demo apps'])
  expect(projects[0]?.apps.map((app) => app.name).toSorted()).toEqual(['Admin', 'Market'])
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

test('a person creates a workspace and invites a writer through better-auth', async () => {
  const headers = { cookie: sessionCookie, origin: baseUrl, 'content-type': 'application/json' }

  const created = await fetch(`${baseUrl}/api/auth/organization/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Second workspace', slug: 'second-workspace' }),
  }).then((response) => response.json())

  expect(created.id).toMatch(/^[0-9a-f-]{36}$/u)

  const invited = await fetch(`${baseUrl}/api/auth/organization/invite-member`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: 'writer@glot.test', role: 'writer', organizationId: created.id }),
  })

  expect(invited.status).toBe(200)
  await expect(invited.json()).resolves.toMatchObject({ role: 'writer', status: 'pending' })
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
