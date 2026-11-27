import { createGlotClient, createGlotRestClient } from '@glot/sdk'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
let ownerCookie = ''
let workspaceId = ''

async function authCall(options: { cookie: string; path: string; body: unknown }) {
  const response = await fetch(`${baseUrl}/api/auth${options.path}`, {
    method: 'POST',
    headers: { cookie: options.cookie, origin: baseUrl, 'content-type': 'application/json' },
    body: JSON.stringify(options.body),
  })

  return { status: response.status, body: await response.json() }
}

beforeAll(async () => {
  ownerCookie = await signInByMagicLink('marie@glot.test')

  const created = await authCall({
    cookie: ownerCookie,
    path: '/organization/create',
    body: { name: 'Translators', slug: 'translators' },
  })

  workspaceId = created.body.id
})

test('an admin invites a Polish reviewer who signs in through the link and changes only Polish', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  const invited = await owner.people.invite({
    workspaceId,
    email: 'Jan@Glot.test',
    name: 'Jan',
    role: 'reviewer',
    languages: ['pl'],
    expiresAt: new Date('2027-03-31T00:00:00Z'),
  })

  expect(invited).toMatchObject({
    role: 'reviewer',
    languages: ['pl'],
    signedIn: false,
    user: { name: 'Jan', email: 'jan@glot.test' },
  })

  const reviewer = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('jan@glot.test')),
  })

  await expect(reviewer.people.me({ workspaceId })).resolves.toMatchObject({
    role: 'reviewer',
    languages: ['pl'],
  })

  const people = await owner.people.list({ workspaceId })

  expect(people.map(({ user, role, signedIn }) => [user.email, role, signedIn])).toEqual([
    ['marie@glot.test', 'owner', true],
    ['jan@glot.test', 'reviewer', true],
  ])

  await expect(
    reviewer.people.invite({
      workspaceId,
      email: 'someone@glot.test',
      role: 'admin',
      languages: null,
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

test('inviting someone already in the workspace is refused', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  await expect(
    owner.people.invite({ workspaceId, email: 'marie@glot.test', role: 'writer', languages: null }),
  ).rejects.toMatchObject({ code: 'CONFLICT' })
})

test('a person whose access ended no longer sees the workspace', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  const external = await owner.people.invite({
    workspaceId,
    email: 'external@glot.test',
    role: 'writer',
    languages: ['de'],
  })

  const client = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('external@glot.test')),
  })

  await expect(client.people.me({ workspaceId })).resolves.toMatchObject({ role: 'writer' })

  await owner.people.update({
    membershipId: external.id,
    role: 'writer',
    languages: ['de'],
    expiresAt: new Date(Date.now() - 1000),
  })

  await expect(client.people.me({ workspaceId })).rejects.toMatchObject({ code: 'NOT_FOUND' })

  await owner.people.remove({ membershipId: external.id })

  const people = await owner.people.list({ workspaceId })

  expect(people.map(({ user }) => user.email)).not.toContain('external@glot.test')
})

test('an owner whose access ended cannot create a workspace', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  const ended = await owner.people.invite({
    workspaceId,
    email: 'ended-owner@glot.test',
    role: 'owner',
    languages: null,
  })

  const cookie = await signInByMagicLink('ended-owner@glot.test')

  await owner.people.update({
    membershipId: ended.id,
    role: 'owner',
    languages: null,
    expiresAt: new Date(Date.now() - 1000),
  })

  await expect(
    authCall({
      cookie,
      path: '/organization/create',
      body: { name: 'After the end', slug: 'after-the-end' },
    }),
  ).resolves.toMatchObject({ status: 403 })
})

test('an admin cannot change their own access', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const people = await owner.people.list({ workspaceId })
  const self = people.find(({ user }) => user.email === 'marie@glot.test')

  await expect(owner.people.remove({ membershipId: self?.id ?? '' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  })
})

test('a revoked API key is refused', async () => {
  const created = await authCall({
    cookie: ownerCookie,
    path: '/api-key/create',
    body: { name: 'Release agent' },
  })

  const agent = createGlotRestClient({ url: baseUrl, token: created.body.key })

  await expect(agent.projects.list()).resolves.toBeInstanceOf(Array)

  const revoked = await authCall({
    cookie: ownerCookie,
    path: '/api-key/delete',
    body: { keyId: created.body.id },
  })

  expect(revoked.status).toBe(200)
  await expect(agent.projects.list()).rejects.toMatchObject({ response: { status: 401 } })
})

test('an admin cannot make someone an owner', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  await owner.people.invite({
    workspaceId,
    email: 'lead@glot.test',
    role: 'admin',
    languages: null,
  })

  const admin = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('lead@glot.test')),
  })

  await expect(
    admin.people.invite({ workspaceId, email: 'boss@glot.test', role: 'owner', languages: null }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

test('an admin cannot change or remove the owner', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const people = await owner.people.list({ workspaceId })
  const ownerMembership = people.find(({ role }) => role === 'owner')

  const admin = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('lead@glot.test')),
  })

  await expect(
    admin.people.update({
      membershipId: ownerMembership?.id ?? '',
      role: 'viewer',
      languages: null,
      expiresAt: null,
    }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })

  await expect(
    admin.people.remove({ membershipId: ownerMembership?.id ?? '' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

test('changing a role without saying when access ends is refused, so the end date never drops', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const people = await owner.people.list({ workspaceId })
  const jan = people.find(({ user }) => user.email === 'jan@glot.test')
  const change = { membershipId: jan?.id ?? '', role: 'writer', languages: ['pl'] }

  await expect(owner.people.update(change as never)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  await expect(owner.people.list({ workspaceId })).resolves.toContainEqual(
    expect.objectContaining({ id: jan?.id, expiresAt: new Date('2027-03-31T00:00:00Z') }),
  )
})

test('an owner renames the workspace; a writer cannot, and a name is required', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  await expect(
    owner.people.updateWorkspace({ workspaceId, name: '  Translators EU  ' }),
  ).resolves.toEqual({
    id: workspaceId,
    name: 'Translators EU',
  })

  await expect(owner.people.updateWorkspace({ workspaceId, name: '   ' })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
  })

  await owner.people.invite({
    workspaceId,
    email: 'wren@glot.test',
    role: 'writer',
    languages: ['de'],
  })

  const writer = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('wren@glot.test')),
  })

  await expect(writer.people.updateWorkspace({ workspaceId, name: 'Mine' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  })

  const listed = await fetch(`${baseUrl}/api/auth/organization/list`, {
    headers: { cookie: ownerCookie },
  })

  const workspaces: unknown = await listed.json()

  expect(workspaces).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: workspaceId, name: 'Translators EU' })]),
  )
})
