import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGlotClient } from '@glot/sdk'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { SMTPServer } from 'smtp-server'
import { afterAll, beforeAll, expect, test, vi } from 'vite-plus/test'
import { createDatabase } from '@glot/database/server'
import type { ChildProcess } from 'node:child_process'

const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const AUTH_SECRET = 'glot-setup-secret-that-is-at-least-32-characters'
const LINK_PATTERN = /Open this link to create the first administrator: (\S+)/u
const ADMIN = { name: 'Ada Admin', email: 'ada@glot.test', workspaceName: 'Acme Words' }

const mails: string[] = []
let baseUrl = ''
let logFile = ''
let server: ChildProcess | undefined
let smtp: SMTPServer | undefined

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)

    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolve(typeof address === 'object' && address ? address.port : 0))
    })
  })
}

function decodeQuotedPrintable(body: string) {
  return body
    .replace(/=\r?\n/gu, '')
    .replace(/=([0-9A-F]{2})/gu, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
}

function startSmtp(port: number) {
  smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS', 'AUTH'],
    onData(...[stream, , done]) {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))

      stream.on('end', () => {
        mails.push(decodeQuotedPrintable(Buffer.concat(chunks).toString('utf8')))
        done()
      })
    },
  })

  return new Promise<void>((resolve) => smtp?.listen(port, '127.0.0.1', resolve))
}

async function createEmptyDatabase(name: string) {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${name}`)
  await admin.end()

  const connection = createDatabase({ connectionString: ADMIN_URL.replace(/\/glot$/u, `/${name}`) })

  await migrate(connection.drizzle, {
    migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
  })

  await connection.close()
}

async function waitForServer() {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const ready = await fetch(`${baseUrl}/api/v1/openapi.json`)
      .then((response) => response.ok)
      .catch(() => false)

    if (ready) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`The server did not start. See ${logFile}`)
}

async function readSetupLink() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const link = (await readFile(logFile, 'utf8')).match(LINK_PATTERN)?.[1]

    if (link) return new URL(link)

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('No setup link was printed')
}

function post(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify(body),
  })
}

function cookieOf(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

beforeAll(async () => {
  const port = await freePort()
  const smtpPort = await freePort()
  const databaseName = `glot_setup_${port}`
  baseUrl = `http://localhost:${port}`
  await createEmptyDatabase(databaseName)
  await startSmtp(smtpPort)
  logFile = join(await mkdtemp(join(tmpdir(), 'glot-setup-')), 'server.log')
  const output = createWriteStream(logFile)

  server = spawn('bunx', ['nuxt', 'dev', '--port', String(port)], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !/^(?:VITEST|TEST$|NODE_ENV$)/u.test(name)),
      ),
      NUXT_IGNORE_LOCK: '1',
      GLOT_BUILD_DIR: `.nuxt-test-${port}`,
      DATABASE_URL: ADMIN_URL.replace(/\/glot$/u, `/${databaseName}`),
      AUTH_SECRET,
      APP_URL: baseUrl,
      SMTP_URL: `smtp://127.0.0.1:${smtpPort}`,
      MAIL_FROM: 'Glot <glot@example.com>',
    },
  })

  server.stdout?.pipe(output)
  server.stderr?.pipe(output)
  await waitForServer()
})

afterAll(() => {
  server?.kill()
  smtp?.close()
})

test('the first run prints a setup link and the instance reports setup as open', async () => {
  const link = await readSetupLink()

  expect(link.origin).toBe(baseUrl)
  expect(link.pathname).toBe('/setup')
  expect(link.searchParams.get('token')).toBeTruthy()
  await expect(
    fetch(`${baseUrl}/api/auth/setup/status`).then((response) => response.json()),
  ).resolves.toEqual({ open: true })
})

test('a wrong token is refused and creates nobody', async () => {
  const response = await post('/api/auth/setup/complete', { ...ADMIN, token: 'not-the-link' })

  expect(response.status).toBe(403)
  await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_SETUP_LINK' })
  await expect(
    fetch(`${baseUrl}/api/auth/setup/status`).then((response) => response.json()),
  ).resolves.toEqual({ open: true })
})

test('the setup link creates the first administrator and their workspace, and signs them in', async () => {
  const token = (await readSetupLink()).searchParams.get('token') ?? ''
  const response = await post('/api/auth/setup/complete', { ...ADMIN, token })

  expect(response.status).toBe(200)
  const cookie = cookieOf(response)
  expect(cookie).toContain('glot.session_token')

  const session = await fetch(`${baseUrl}/api/auth/get-session`, { headers: { cookie } }).then(
    (result) => result.json(),
  )

  expect(session.user).toMatchObject({ email: ADMIN.email, name: ADMIN.name, emailVerified: true })

  const workspace = await fetch(`${baseUrl}/api/auth/organization/get-full-organization`, {
    headers: { cookie },
  }).then((result) => result.json())

  expect(workspace).toMatchObject({ name: ADMIN.workspaceName, slug: 'acme-words' })

  expect(workspace.members).toMatchObject([{ role: 'owner', user: { email: ADMIN.email } }])

  const glot = createGlotClient({
    url: baseUrl,
    fetch: (input, init) => {
      const headers = new Headers(init?.headers)
      headers.set('cookie', cookie)

      return fetch(input, { ...init, headers })
    },
  })

  await expect(glot.projects.list()).resolves.toEqual([])
})

test('the link stops working once used and setup closes', async () => {
  const token = (await readSetupLink()).searchParams.get('token') ?? ''

  const reused = await post('/api/auth/setup/complete', {
    ...ADMIN,
    email: 'mallory@glot.test',
    token,
  })

  expect(reused.status).toBe(403)
  await expect(
    fetch(`${baseUrl}/api/auth/setup/status`).then((response) => response.json()),
  ).resolves.toEqual({ open: false })
})

test('the administrator signs in again with a link sent through SMTP', async () => {
  const sent = await post('/api/auth/sign-in/magic-link', { email: ADMIN.email, callbackURL: '/' })
  expect(sent.status).toBe(200)

  const mail = await vi.waitFor(() => {
    const received = mails.at(-1)
    expect(received).toBeDefined()

    return received ?? ''
  })

  expect(mail).toContain('To: ada@glot.test')
  expect(mail).toContain('From: Glot <glot@example.com>')

  const link = mail.match(/https?:\/\/\S+\/api\/auth\/magic-link\/verify\S+/u)?.[0] ?? ''
  const verified = await fetch(link, { redirect: 'manual' })
  expect(cookieOf(verified)).toContain('glot.session_token')
})
