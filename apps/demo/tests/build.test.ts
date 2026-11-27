import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'

const run = promisify(execFile)
const app = new URL('..', import.meta.url).pathname
const scratch = await mkdtemp(join(tmpdir(), 'glot-demo-build-'))

const GLOT_MARKERS = {
  WIDGET_ELEMENT: 'glot-widget',
  WIDGET_RPC: '/widget/rpc',
  KEY_LOG_STORAGE: 'glot:signed-before:',
  SIGN_IN_WINDOW: 'glot-sign-in',
  STYLESHEET: '.w-drawer',
}

const DEMO_MARKER = '.bid-row'

const outputs = new Map<string, string>()

async function build(enabled: boolean) {
  const name = enabled ? 'on' : 'off'
  const output = join(scratch, name, 'output')

  await run('bunx', ['nuxt', 'build'], {
    cwd: app,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !/^(?:VITEST|TEST$|NODE_ENV$)/u.test(key)),
      ),
      NUXT_IGNORE_LOCK: '1',
      GLOT_ENABLED: String(enabled),
      DEMO_BUILD_DIR: join(scratch, name, 'nuxt'),
      DEMO_OUTPUT_DIR: output,
    },
    maxBuffer: 64 * 1024 * 1024,
  })

  outputs.set(name, output)
}

async function markersIn(directory: string) {
  const files = await readdir(directory, { recursive: true, withFileTypes: true })
  const found = new Set<string>()
  let demo = false

  for (const file of files) {
    if (!file.isFile() || !/\.(?:m?js|css|html|json)$/u.test(file.name)) continue

    const content = await readFile(join(file.parentPath, file.name), 'utf8')

    demo ||= content.includes(DEMO_MARKER)

    for (const [name, marker] of Object.entries(GLOT_MARKERS)) {
      if (content.includes(marker)) found.add(name)
    }
  }

  if (!demo) throw new Error(`${directory} holds no build of the demo app`)

  return [...found].toSorted()
}

beforeAll(async () => {
  await Promise.all([build(false), build(true)])
}, 600_000)

afterAll(() => rm(scratch, { recursive: true, force: true }))

test('a production build with the widget off carries no Glot code, server or browser', async () => {
  expect(await markersIn(outputs.get('off') ?? '')).toEqual([])
})

test('a production build with the widget on ships the widget, its key log, its stylesheet and its transport to the browser', async () => {
  expect(await markersIn(join(outputs.get('on') ?? '', 'public'))).toEqual(
    Object.keys(GLOT_MARKERS).toSorted(),
  )
})
