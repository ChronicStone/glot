import { createGlotClient } from '@glot/sdk'
import { DEMO_REPOSITORY, DEMO_SOURCE } from '@glot/seed/fixtures'
import { seedDemoRepository } from '@glot/seed/repository'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
const agentKey = inject('agentKey')
const REPOSITORY = 'glot/projects'
let ownerCookie = ''
let workspaceId = ''

const project = {
  name: 'Demo again',
  repository: REPOSITORY,
  defaultBranch: 'main',
  sourceLanguage: DEMO_SOURCE.sourceLanguage,
  languages: DEMO_SOURCE.languages,
  sources: [{ ...DEMO_SOURCE, kind: 'vue-i18n' as const }],
}

beforeAll(async () => {
  await seedDemoRepository({ root: inject('repositoriesRoot'), repository: REPOSITORY })
  ownerCookie = await signInByMagicLink('marie@glot.test')

  const created = await fetch(`${baseUrl}/api/auth/organization/create`, {
    method: 'POST',
    headers: { cookie: ownerCookie, origin: baseUrl, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Projects', slug: 'projects' }),
  }).then((response) => response.json())

  workspaceId = created.id
})

test('an admin adds a repository, reads it, then narrows its languages', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const created = await owner.projects.create({ workspaceId, ...project })

  expect(created).toMatchObject({
    workspaceId,
    name: 'Demo again',
    sources: [{ name: 'shared-base' }],
  })
  await expect(owner.projects.sync({ projectId: created.id })).resolves.toMatchObject({ texts: 8 })

  const updated = await owner.projects.update({
    projectId: created.id,
    name: 'Demo, Polish only',
    defaultBranch: 'main',
    sourceLanguage: 'fr',
    languages: ['fr', 'pl'],
    sources: [{ ...project.sources[0], languages: ['fr', 'pl'] }],
  })

  expect(updated).toMatchObject({ name: 'Demo, Polish only', languages: ['fr', 'pl'] })

  const page = await owner.texts.search({ projectId: created.id, limit: 1 })

  expect(page.items[0]?.translations.map(({ language }) => language)).toEqual(['pl'])
})

test('the same repository cannot be added twice to a workspace', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  await expect(
    owner.projects.create({ workspaceId, ...project, name: 'Twice' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' })
})

test('a reviewer cannot add a project', async () => {
  const anna = createGlotClient({
    url: baseUrl,
    fetch: withCookie(await signInByMagicLink('anna@glot.test')),
  })

  const demo = (await anna.projects.list()).find(({ name }) => name === 'Demo apps')

  await expect(
    anna.projects.create({ ...project, workspaceId: demo?.workspaceId ?? '' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' })
})

test('a repository must be owner/name, never a path', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  for (const repository of ['../../etc', 'glot', 'glot/demo/extra', 'glot/..']) {
    await expect(
      owner.projects.create({ workspaceId, ...project, repository }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  }
})

test('a repository already used by another workspace is refused', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  for (const repository of [DEMO_REPOSITORY, DEMO_REPOSITORY.toUpperCase()]) {
    await expect(
      owner.projects.create({ workspaceId, ...project, repository }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  }
})

test('an agent key cannot add or change a project, and MCP does not offer it', async () => {
  const agent = createGlotClient({ url: baseUrl, token: agentKey })
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const [existing] = await owner.projects.list()

  await expect(agent.projects.create({ workspaceId, ...project })).rejects.toMatchObject({
    code: 'PEOPLE_ONLY',
  })

  await expect(
    agent.projects.update({
      projectId: existing?.id ?? '',
      name: 'x',
      defaultBranch: 'main',
      sourceLanguage: 'fr',
      languages: ['fr'],
      sources: [{ ...project.sources[0], languages: ['fr'] }],
    }),
  ).rejects.toMatchObject({ code: 'PEOPLE_ONLY' })

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

  expect(names).toContain('listProjects')
  expect(names).not.toContain('createProject')
  expect(names).not.toContain('updateProject')
})

test('a source path stays inside the repository and names a JSON file per language', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })

  for (const pathPattern of [
    '../secrets/{locale}.json',
    'config/../{locale}.json',
    '/etc/{locale}.json',
    'locales\\{locale}.json',
    'config/secrets.json',
    'locales/{locale}.yml',
  ]) {
    await expect(
      owner.projects.create({
        workspaceId,
        ...project,
        repository: 'glot/other',
        sources: [{ ...project.sources[0], pathPattern }],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  }

  for (const defaultBranch of ['../main', '/main', 'a\\b', 'feature/../main']) {
    await expect(
      owner.projects.create({ workspaceId, ...project, repository: 'glot/other', defaultBranch }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  }
})

test('a source only keeps the languages the project has', async () => {
  const owner = createGlotClient({ url: baseUrl, fetch: withCookie(ownerCookie) })
  const narrow = { ...project, repository: 'glot/narrow', languages: ['fr', 'pl'] }
  const wide = { ...project.sources[0], languages: ['fr', 'pl', 'de'] }

  const created = await owner.projects.create({ workspaceId, ...narrow, sources: [wide] })

  expect(created.sources[0]?.languages).toEqual(['fr', 'pl'])

  const updated = await owner.projects.update({
    projectId: created.id,
    name: narrow.name,
    defaultBranch: 'main',
    sourceLanguage: 'fr',
    languages: ['fr'],
    sources: [wide],
  })

  expect(updated.languages).toEqual(['fr'])
  expect(updated.sources[0]?.languages).toEqual(['fr'])
})
