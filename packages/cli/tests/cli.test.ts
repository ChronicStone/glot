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

const CHECK = ['check', PATTERN, '--source-language', 'fr', '--languages', 'fr,en,de,pl']

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
  for (const args of [[], ['check'], ['check', PATTERN], ['sync']]) {
    const result = await glot(args)

    expect(result.code).toBe(2)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('USAGE')
    expect(result.stderr).toContain('glot check')
  }
})

test('--help prints the usage of the command it follows, with exit code 0', async () => {
  const check = await glot(['check', '--help'])
  const root = await glot(['--help'])

  expect(check.code).toBe(0)
  expect(check.stdout).toContain('--source-language')
  expect(check.stdout).toContain('{locale}')
  expect(root.code).toBe(0)
  expect(root.stdout).toContain('check')
})

test('every source given is checked', async () => {
  await write({ path: 'menus/fr.json', content: { bid: 'Enchérir {amount}' } })
  await write({ path: 'menus/en.json', content: { bid: 'Bid' } })
  await write({ path: 'emails/fr.json', content: { subject: 'Votre lot {lot}' } })
  await write({ path: 'emails/en.json', content: { subject: 'Your lot' } })

  const result = await glot([
    'check',
    'menus/{locale}.json',
    'emails/{locale}.json',
    '--source-language',
    'fr',
    '--languages',
    'fr,en',
  ])

  expect(result.code).toBe(1)
  expect(result.stdout).toContain('menus/en.json  bid  PLACEHOLDERS')
  expect(result.stdout).toContain('emails/en.json  subject  PLACEHOLDERS')
  expect(result.stdout.split('\n').at(-2)).toBe('2 texts checked, 2 failures.')
})

test('the source file is read even when the languages leave its language out', async () => {
  const result = await glot(['check', PATTERN, '--source-language', 'fr', '--languages', 'en,de'])

  expect(result.code).toBe(1)
  expect(result.stdout.split('\n').at(-2)).toBe('7 texts checked, 2 failures.')
})

test('a missing source file stops the run with exit code 2, whatever the languages', async () => {
  await write({ path: 'orphans/en.json', content: { actions: { save: 'Save' } } })

  for (const languages of ['fr,en', 'en']) {
    const result = await glot([
      'check',
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

test('email texts are checked with --syntax handlebars-html: their placeholders pass, a changed link fails', async () => {
  await write({
    path: 'mails/fr.json',
    content: { hi: 'Bonjour {{firstName}}', manage: 'Gérer <a href="https://glot.dev/n">ici</a>' },
  })
  await write({
    path: 'mails/en.json',
    content: {
      hi: 'Hello {{firstName}}',
      manage: 'Manage <a href="https://evil.example/n">here</a>',
    },
  })

  const args = ['check', 'mails/{locale}.json', '--source-language', 'fr', '--languages', 'fr,en']
  const templates = await glot([...args, '--syntax', 'handlebars-html'])

  expect(templates.code).toBe(1)
  expect(templates.stdout.split('\n').slice(0, -1)).toEqual([
    'mails/en.json  manage  MARKUP  The markup and links must match the source text: only a Developer changes them. Missing from this text: <a href="https://glot.dev/n">. Not in the source text: <a href="https://evil.example/n">.',
    '2 texts checked, 1 failure.',
  ])

  const unknown = await glot([...args, '--syntax', 'mustache'])

  expect(unknown.code).toBe(2)
  expect(unknown.stderr).toContain('Expected one of')
})

test('a source text that leaves markup open fails, since any text can be linked into another', async () => {
  await write({
    path: 'broken/fr.json',
    content: { ineq: 'Si x<i alors', fine: 'Prix &lt; 10 €' },
  })

  const result = await glot([
    'check',
    'broken/{locale}.json',
    '--source-language',
    'fr',
    '--languages',
    'fr,en',
  ])

  expect(result.code).toBe(1)
  expect(result.stdout).toContain('broken/fr.json  ineq  HTML_TAGS')
  expect(result.stdout).not.toContain('fine')
})
