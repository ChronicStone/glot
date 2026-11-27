import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'

const run = promisify(execFile)
const BIN = new URL('../src/bin.ts', import.meta.url).pathname
const PATTERN = 'locales/{locale}.json'

let root = ''

async function write(options: { path: string; content: unknown }) {
  const file = join(root, options.path)

  await mkdir(dirname(file), { recursive: true })
  await writeFile(
    file,
    typeof options.content === 'string'
      ? options.content
      : JSON.stringify(options.content, null, 2),
  )
}

async function glot(args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [BIN, ...args], { cwd: root })

    return { code: 0, stdout, stderr }
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string }

    return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr }
  }
}

const CHECK = [
  'check',
  '--source',
  PATTERN,
  '--source-language',
  'fr',
  '--languages',
  'fr,en,de,pl',
]

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'glot-cli-'))

  await write({
    path: 'locales/fr.json',
    content: {
      actions: { save: 'Enregistrer' },
      ended: 'Fin le {date}',
      bids: '{count} enchère | {count} enchères',
      lot: 'Ce lot est vendu aux enchères.',
    },
  })

  await write({
    path: 'locales/en.json',
    content: {
      actions: { save: 'Save' },
      ended: 'Ended on {date}',
      bids: '{count} bid | {count} bids',
    },
  })
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

test('texts that agree with their source pass, and a language without a file is skipped', async () => {
  const result = await glot(CHECK)

  expect(result).toMatchObject({ code: 0, stdout: '3 texts checked, 0 failures.\n' })
})

test('each failed check is printed with its file, key and code, and the exit code is 1', async () => {
  await write({
    path: 'locales/de.json',
    content: {
      actions: { save: 'Speichern' },
      ended: 'Endet am {datum}',
      bids: '{count} Gebot',
      lot: 'Dieses Grundstück wird versteigert.',
    },
  })

  const result = await glot(CHECK)

  expect(result.code).toBe(1)

  expect(result.stdout.split('\n')).toEqual([
    'locales/de.json  ended  PLACEHOLDERS  The placeholders must match the source text. Missing from this text: {date}. Not in the source text: {datum}.',
    'locales/de.json  bids  PLURAL_FORMS  The source text has 2 plural forms, separated by |. This text has 1.',
    '7 texts checked, 2 failures.',
    '',
  ])
})

test('words to avoid come from a file, per language', async () => {
  await write({ path: 'avoid.json', content: { de: ['Grundstück'], en: ['Bid'] } })

  const result = await glot([...CHECK, '--avoid', 'avoid.json'])

  expect(result.code).toBe(1)

  expect(result.stdout).toContain(
    'locales/de.json  lot  AVOID_WORDS  Avoid “Grundstück”: the glossary asks for another word.',
  )

  expect(result.stdout).toContain('locales/en.json  bids  AVOID_WORDS')
})

test('a file that is not JSON stops the run with exit code 2', async () => {
  await write({ path: 'locales/pl.json', content: '{ "actions": ' })

  const result = await glot(CHECK)

  expect(result).toMatchObject({ code: 2, stdout: '' })
  expect(result.stderr).toContain('locales/pl.json is not valid JSON')
})

test('missing arguments and unknown commands print the usage with exit code 2', async () => {
  for (const args of [['check'], ['check', '--source', PATTERN], ['sync']]) {
    const result = await glot(args)

    expect(result.code).toBe(2)
    expect(result.stderr).toContain('Usage: glot check --source <pattern>')
  }
})

test('the source file is read even when the languages leave its language out', async () => {
  const result = await glot([
    'check',
    '--source',
    PATTERN,
    '--source-language',
    'fr',
    '--languages',
    'en,de',
  ])

  expect(result.code).toBe(1)
  expect(result.stdout.split('\n').at(-2)).toBe('7 texts checked, 2 failures.')
})

test('a missing source file stops the run with exit code 2, whatever the languages', async () => {
  await write({ path: 'orphans/en.json', content: { actions: { save: 'Save' } } })

  for (const languages of ['fr,en', 'en']) {
    const result = await glot([
      'check',
      '--source',
      'orphans/{locale}.json',
      '--source-language',
      'fr',
      '--languages',
      languages,
    ])

    expect(result).toMatchObject({ code: 2, stdout: '' })
    expect(result.stderr).toContain('orphans/fr.json')
  }
})

test('a key with a dot and a nested key are two texts', async () => {
  await write({ path: 'dotted/fr.json', content: { 'a.b': 'Un {n}', a: { b: 'Deux' } } })
  await write({ path: 'dotted/en.json', content: { 'a.b': 'One', a: { b: 'Two {z}' } } })

  const result = await glot([
    'check',
    '--source',
    'dotted/{locale}.json',
    '--source-language',
    'fr',
    '--languages',
    'fr,en',
  ])

  expect(result.code).toBe(1)
  expect(
    result.stdout.split('\n').filter((line) => line.startsWith('dotted/en.json')),
  ).toHaveLength(2)
  expect(result.stdout.split('\n').at(-2)).toBe('2 texts checked, 2 failures.')
})
