import { DEMO_REPOSITORY, DEMO_SOURCE } from '@glot/seed/fixtures'
import { createGlotClient } from '@glot/sdk'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
let ownerCookie = ''
let workspaceId = ''

const project = {
  name: 'Demo again',
  repository: DEMO_REPOSITORY,
  defaultBranch: 'main',
  sourceLanguage: DEMO_SOURCE.sourceLanguage,
  languages: DEMO_SOURCE.languages,
  sources: [{ ...DEMO_SOURCE, kind: 'vue-i18n' as const }],
}

beforeAll(async () => {
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
