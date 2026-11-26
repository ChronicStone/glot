import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createDatabase } from '@glot/database/server'
import { createGlotClient, createGlotRestClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { beforeAll, expect, inject, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { GithubGitReader } from '../server/domains/catalogs/services/github-git-reader.service.ts'
import { GITHUB_RECORDING } from './fixtures/github.fixtures.ts'
import { signInByMagicLink, withCookie } from './support/session.ts'

const run = promisify(execFile)
const baseUrl = inject('baseUrl')
const demoProjectId = inject('projectId')
const agentKey = inject('agentKey')
const LOCALES = 'packages/translations/i18n/locales'

let sessionCookie = ''
let projectId = ''
let repository = ''

function person() {
  return createGlotClient({ url: baseUrl, fetch: withCookie(sessionCookie) })
}

async function git(...args: string[]) {
  const { stdout } = await run('git', ['-C', repository, ...args])

  return stdout.trim()
}

async function commitChange(options: { language: string; from: string; to: string }) {
  const file = join(repository, LOCALES, `${options.language}.json`)
  const content = await readFile(file, 'utf8')

  expect(content).toContain(options.from)

  await writeFile(file, content.replace(options.from, options.to))
  await git('add', '--all')

  await git(
    '-c',
    'user.name=Dev',
    '-c',
    'user.email=dev@glot.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--message',
    `Change ${options.from}`,
  )
}

async function textBySource(source: string) {
  const page = await person().texts.search({ projectId, q: source })
  const text = page.items.find((item) => item.source.value === source)

  if (!text) throw new Error(`No text reads ${source}`)

  return text
}

function translation(options: {
  text: Awaited<ReturnType<typeof textBySource>>
  language: string
}) {
  const found = options.text.translations.find((item) => item.language === options.language)

  if (!found) throw new Error(`No ${options.language} translation`)

  return found
}

beforeAll(async () => {
  sessionCookie = await signInByMagicLink('anna@glot.test')

  const connection = createDatabase({ connectionString: inject('databaseUrl') })
  const demo = await connection.db.projects.findFirst({ where: { id: demoProjectId } })

  if (!demo) throw new Error('The demo project is missing')

  const created = await seedDemoProject(connection.db, {
    workspaceId: demo.workspaceId,
    repository: 'glot/catalog',
  })

  await connection.close()
  projectId = created.id

  const seeded = await seedDemoRepository({
    root: inject('repositoriesRoot'),
    repository: 'glot/catalog',
  })

  repository = seeded.directory
})

test('the seeded project lists the texts read from its git files, with their states', async () => {
  const page = await person().texts.search({ projectId: demoProjectId })

  expect(page.total).toBe(8)

  expect(page.items.map((text) => text.source.value)).toEqual([
    'Enregistrer',
    'Supprimer',
    'Enchère dépassée',
    'Fin le {date}',
    '{count} enchère | {count} enchères',
    'Ce lot est vendu aux enchères.',
    'J’accepte les <a href="/terms">conditions</a>',
    'Il manque le moyen de paiement.',
  ])

  const save = page.items.find((text) => text.source.value === 'Enregistrer')

  expect(save).toMatchObject({
    source: { language: 'fr', value: 'Enregistrer' },
    where: 'shared-base',
    shownIn: ['Admin', 'Market'],
  })

  expect(save?.key).toEqual({ source: 'shared-base', path: ['actions', 'save'] })

  expect(
    save?.translations.map(({ language, value, state, reviewedBy }) => ({
      language,
      value,
      state,
      reviewedBy,
    })),
  ).toEqual([
    { language: 'en', value: 'Save', state: 'REVIEWED', reviewedBy: 'user-anna' },
    { language: 'de', value: 'Speichern', state: 'REVIEWED', reviewedBy: 'user-anna' },
    { language: 'pl', value: 'Ratować', state: 'TO_CHECK', reviewedBy: null },
    { language: 'nl', value: 'Opslaan', state: 'REVIEWED', reviewedBy: 'user-anna' },
  ])
})

test('each failed check is reported on the text with its code and a reason', async () => {
  const page = await person().texts.search({ projectId: demoProjectId, state: 'NEEDS_FIX' })

  const failures = page.items.flatMap((text) =>
    text.translations
      .filter((item) => item.state === 'NEEDS_FIX')
      .map((item) => ({
        source: text.source.value,
        language: item.language,
        failures: item.failures,
      })),
  )

  expect(failures).toEqual(
    expect.arrayContaining([
      {
        source: 'Fin le {date}',
        language: 'pl',
        failures: [
          {
            code: 'PLACEHOLDERS',
            message:
              'The placeholders must match the source text. Missing from this text: {date}. Not in the source text: {data}.',
          },
        ],
      },
      {
        source: '{count} enchère | {count} enchères',
        language: 'de',
        failures: [
          {
            code: 'PLURAL_FORMS',
            message: 'The source text has 2 plural forms, separated by |. This text has 1.',
          },
        ],
      },
      {
        source: 'Ce lot est vendu aux enchères.',
        language: 'de',
        failures: [
          {
            code: 'AVOID_WORDS',
            message: 'Avoid “Grundstück”: the glossary asks for another word.',
          },
        ],
      },
      {
        source: 'J’accepte les <a href="/terms">conditions</a>',
        language: 'de',
        failures: [
          {
            code: 'HTML_TAGS',
            message: 'The HTML tags must match the source text. Missing from this text: </a>.',
          },
        ],
      },
    ]),
  )

  expect(failures).toHaveLength(4)
})

test('a text absent from the target file is missing', async () => {
  const text = await textBySource('Ce lot est vendu aux enchères.')

  expect(translation({ text, language: 'pl' })).toMatchObject({
    value: null,
    state: 'MISSING',
    failures: [],
  })
})

test('a commit in the repository shows in the texts only after projects.sync', async () => {
  const before = await textBySource('Enregistrer')
  expect(before.translations).toHaveLength(4)

  await commitChange({ language: 'fr', from: '"Enregistrer"', to: '"Sauvegarder"' })
  const head = await git('rev-parse', 'HEAD')

  expect((await person().texts.search({ projectId, q: 'Sauvegarder' })).total).toBe(0)

  const synced = await createGlotRestClient({ url: baseUrl, token: agentKey }).projects.sync({
    projectId,
  })

  expect(synced).toEqual({ commit: head, texts: 8 })

  const after = await textBySource('Sauvegarder')

  expect(after.key).toEqual({ source: 'shared-base', path: ['actions', 'save'] })
  expect((await person().texts.search({ projectId, q: 'Enregistrer' })).total).toBe(0)
})

test('an approval stops counting when the French changes', async () => {
  const sauvegarder = await textBySource('Sauvegarder')

  expect(translation({ text: sauvegarder, language: 'en' })).toMatchObject({
    value: 'Save',
    state: 'TO_CHECK',
    reviewedBy: null,
  })

  const outbid = await textBySource('Enchère dépassée')

  const approved = await person().reviews.approve({
    projectId,
    textId: outbid.id,
    language: 'de',
  })

  expect(translation({ text: approved, language: 'de' })).toMatchObject({
    state: 'REVIEWED',
    reviewedBy: 'user-anna',
  })

  await commitChange({ language: 'fr', from: '"Enchère dépassée"', to: '"Surenchère"' })
  await person().projects.sync({ projectId })

  const changed = await textBySource('Surenchère')

  expect(changed.id).toBe(outbid.id)
  expect(translation({ text: changed, language: 'de' })).toMatchObject({
    value: 'Überboten',
    state: 'TO_CHECK',
    reviewedBy: null,
  })
})

test('a renamed placeholder shows as needing a fix with its reason', async () => {
  const before = await textBySource('Fin le {date}')

  expect(translation({ text: before, language: 'nl' })).toMatchObject({
    state: 'REVIEWED',
    failures: [],
  })

  await commitChange({ language: 'nl', from: 'Eindigt op {date}', to: 'Eindigt op {datum}' })
  await person().projects.sync({ projectId })

  const after = await textBySource('Fin le {date}')

  expect(translation({ text: after, language: 'nl' })).toMatchObject({
    value: 'Eindigt op {datum}',
    state: 'NEEDS_FIX',
    reviewedBy: null,
    failures: [
      {
        code: 'PLACEHOLDERS',
        message:
          'The placeholders must match the source text. Missing from this text: {date}. Not in the source text: {datum}.',
      },
    ],
  })

  const needFix = await person().texts.search({ projectId, state: 'NEEDS_FIX', language: 'nl' })

  expect(needFix.items.map((text) => text.source.value)).toEqual(['Fin le {date}'])
})

test('syncing a project the caller cannot see is refused', async () => {
  await expect(
    person().projects.sync({ projectId: '019b0000-0000-7000-8000-000000000000' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

test('the GitHub adapter reads the branch head and the files at that commit', async () => {
  const requests: Array<{ url: string; headers: Headers }> = []

  const replay: typeof fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input).toString()
    const headers = new Headers(init?.headers)
    requests.push({ url, headers })

    const recorded = GITHUB_RECORDING.exchanges.find((exchange) => exchange.url === url)

    if (!recorded) throw new Error(`Not recorded: ${url}`)

    expect(headers.get('accept')).toBe(recorded.accept)

    return Promise.resolve(new Response(recorded.body, { status: recorded.status }))
  }

  const reader = new GithubGitReader({ token: 'ghp_recorded', fetch: replay })

  const catalog = new CatalogService({ reader })

  const result = await catalog.read({
    id: 'project',
    repository: 'acme/app',
    defaultBranch: 'release/main',
    sourceLanguage: 'fr',
    languages: ['fr', 'en'],
    sources: [
      {
        id: 'source',
        projectId: 'project',
        name: 'shared-base',
        kind: 'vue-i18n',
        pathPattern: `${LOCALES}/{locale}.json`,
        sourceLanguage: 'fr',
        languages: ['fr', 'en'],
        createdAt: new Date(0),
      },
    ],
  })

  expect(result.commit).toBe(GITHUB_RECORDING.sha)

  expect(
    result.entries.map((entry) => ({
      path: entry.key.path,
      translations: entry.translations.map(({ language, value }) => ({ language, value })),
    })),
  ).toEqual([
    { path: ['actions', 'save'], translations: [{ language: 'en', value: 'Save' }] },
    { path: ['actions', 'delete'], translations: [{ language: 'en', value: null }] },
  ])

  expect(result.released.size).toBe(0)
  expect(requests).toHaveLength(GITHUB_RECORDING.exchanges.length)

  for (const request of requests) {
    expect(request.headers.get('authorization')).toBe('Bearer ghp_recorded')
    expect(request.headers.get('x-github-api-version')).toBe('2022-11-28')
    expect(request.headers.get('user-agent')).toBe('glot')
  }
})
