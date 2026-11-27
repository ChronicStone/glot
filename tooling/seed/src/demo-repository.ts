import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { PREVIEW_DEMO_SOURCES } from '@glot/preview-demo/constants'
import { hashText } from '@glot/utils/hash'
import {
  DEMO_REPOSITORY,
  DEMO_REVIEWER,
  DEMO_SOURCE,
  DEMO_TEXTS,
} from './fixtures/demo-repository.fixtures.ts'
import { DEMO_APP_TEXTS } from './fixtures/demo-app.fixtures.ts'
import { DEMO_EMAIL_TEXTS } from './fixtures/demo-emails.fixtures.ts'

const run = promisify(execFile)

function nestMessages(entries: Array<{ path: string[]; value: string }>) {
  const root: Record<string, unknown> = {}
  const nodes = new Map<string, Record<string, unknown>>()

  for (const { path, value } of entries) {
    let parent = root

    for (let depth = 1; depth < path.length; depth += 1) {
      const id = JSON.stringify(path.slice(0, depth))
      const node = nodes.get(id) ?? {}

      nodes.set(id, node)
      parent[path[depth - 1] ?? ''] = node
      parent = node
    }

    parent[path.at(-1) ?? ''] = value
  }

  return root
}

function git(options: { directory: string; args: string[] }) {
  return run('git', ['-C', options.directory, ...options.args])
}

async function writeRepositoryFile(options: { directory: string; path: string; content: string }) {
  const file = join(options.directory, options.path)

  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, options.content)
}

function reviewLine(options: {
  source: string
  path: string[]
  values: Record<string, string>
  sourceLanguage: string
  language: string
}) {
  return JSON.stringify({
    key: { source: options.source, path: options.path },
    sourceHash: hashText(options.values[options.sourceLanguage] ?? ''),
    targetHash: hashText(options.values[options.language] ?? ''),
    reviewedBy: DEMO_REVIEWER,
  })
}

export async function seedDemoRepository(options: {
  root: string
  repository?: string
  withApp?: boolean
  withEmails?: boolean
}) {
  const directory = join(options.root, options.repository ?? DEMO_REPOSITORY)
  const texts = options.withApp ? [...DEMO_TEXTS, ...DEMO_APP_TEXTS] : DEMO_TEXTS
  const emails = options.withEmails ? DEMO_EMAIL_TEXTS : []
  const emailSources = Object.values(PREVIEW_DEMO_SOURCES)

  await rm(directory, { recursive: true, force: true })
  await mkdir(directory, { recursive: true })

  for (const language of DEMO_SOURCE.languages) {
    const entries = texts.flatMap(({ path, values }) =>
      values[language] === undefined ? [] : [{ path, value: values[language] }],
    )

    await writeRepositoryFile({
      directory,
      path: DEMO_SOURCE.pathPattern.replace('{locale}', language),
      content: `${JSON.stringify(nestMessages(entries), null, 2)}\n`,
    })

    for (const source of options.withEmails ? emailSources : []) {
      const messages = emails.flatMap(({ source: name, path, values }) =>
        name !== source.name || values[language] === undefined
          ? []
          : [{ path, value: values[language] }],
      )

      await writeRepositoryFile({
        directory,
        path: source.pathPattern.replace('{locale}', language),
        content: `${JSON.stringify(nestMessages(messages), null, 2)}\n`,
      })
    }

    const reviews = [
      ...texts
        .filter(({ reviewed }) => reviewed.includes(language))
        .map((text) =>
          reviewLine({
            source: DEMO_SOURCE.name,
            path: text.path,
            values: text.values,
            sourceLanguage: DEMO_SOURCE.sourceLanguage,
            language,
          }),
        ),
      ...emails
        .filter(({ reviewed }) => reviewed.includes(language))
        .map((text) =>
          reviewLine({
            source: text.source,
            path: text.path,
            values: text.values,
            sourceLanguage: DEMO_SOURCE.sourceLanguage,
            language,
          }),
        ),
    ]

    if (reviews.length > 0) {
      await writeRepositoryFile({
        directory,
        path: `.glot/reviews/${language}.jsonl`,
        content: `${reviews.join('\n')}\n`,
      })
    }
  }

  await git({ directory, args: ['init', '--initial-branch', 'main'] })
  await git({ directory, args: ['add', '--all'] })

  await git({
    directory,
    args: [
      '-c',
      'user.name=Glot demo',
      '-c',
      'user.email=demo@glot.test',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--message',
      'Add the demo translations',
    ],
  })

  return { directory }
}
