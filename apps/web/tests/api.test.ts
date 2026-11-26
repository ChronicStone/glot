import { readFile } from 'node:fs/promises'
import { createGlotClient, createGlotRestClient } from '@glot/sdk'
import { beforeAll, expect, inject, test } from 'vite-plus/test'

const baseUrl = inject('baseUrl')
const projectId = inject('projectId')
const agentKey = inject('agentKey')
let sessionCookie = ''

async function readSignInLink(email: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const log = await readFile(inject('serverLog'), 'utf8')

    const link = [...log.matchAll(new RegExp(`Sign-in link for ${email}: (\\S+)`, 'gu'))].at(
      -1,
    )?.[1]

    if (link) return link
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('No sign-in link was sent')
}

async function signInByMagicLink(email: string) {
  await fetch(`${baseUrl}/api/auth/sign-in/magic-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify({ email, callbackURL: '/' }),
  })
  const link = await readSignInLink(email)
  const response = await fetch(link, { redirect: 'manual' })

  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

function withCookie(cookie: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers)
    headers.set('cookie', cookie)

    return fetch(input, { ...init, headers })
  }
}

beforeAll(async () => {
  sessionCookie = await signInByMagicLink('anna@glot.test')
})

test('a signed-in person reads the Polish texts that need a fix, most seen first', async () => {
  const glot = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
  const page = await glot.texts.search({ projectId, state: 'NEEDS_FIX', language: 'pl' })
  expect(page.items.map((text) => text.source.value)).toEqual(['Enregistrer', 'Supprimer'])
})

test('projects list with their apps through the public REST API and an agent key', async () => {
  const glot = createGlotRestClient({ url: baseUrl, token: agentKey })
  const projects = await glot.projects.list()
  expect(projects.map((project) => project.name)).toEqual(['Demo apps'])
  expect(projects[0]?.apps.map((app) => app.name).toSorted()).toEqual(['Admin', 'Market'])
})

test('an agent key cannot approve, a signed-in person can', async () => {
  const agent = createGlotClient({ url: baseUrl, token: agentKey })
  await expect(
    agent.reviews.approve({ projectId, textId: 'lotCard.outbid', language: 'de' }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

  const anna = createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })

  const text = await anna.reviews.approve({
    projectId,
    textId: 'lotCard.outbid',
    language: 'de',
  })

  expect(text.translations.find((t) => t.language === 'de')).toMatchObject({
    state: 'REVIEWED',
    reviewedBy: 'user-anna',
  })
})

test('approving through the public REST API with a key is refused with 403', async () => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}/reviews`, {
    method: 'POST',
    headers: { authorization: `Bearer ${agentKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ textId: 'lotCard.outbid', language: 'nl' }),
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
    textId: 'actions.save',
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
