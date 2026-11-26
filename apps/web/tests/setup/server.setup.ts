import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGlotAuth } from '@glot/auth'
import { createDatabase } from '@glot/database/server'
import { seedDemo } from '@glot/seed'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import type { TestProject } from 'vite-plus/test/node'

const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const DATABASE_URL = ADMIN_URL.replace(/\/glot$/u, '/glot_test')
const PORT = 3199
const BASE_URL = `http://localhost:${PORT}`
const AUTH_SECRET = 'glot-test-secret-that-is-at-least-32-characters'

async function resetDatabase() {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query('DROP DATABASE IF EXISTS glot_test WITH (FORCE)')
  await admin.query('CREATE DATABASE glot_test')
  await admin.end()
}

async function seed() {
  const connection = createDatabase({ connectionString: DATABASE_URL })
  await migrate(connection.drizzle, {
    migrationsFolder: new URL('../../../../packages/database/migrations', import.meta.url).pathname,
  })
  const { user, project } = await seedDemo(connection.db)

  const auth = createGlotAuth({
    baseURL: BASE_URL,
    database: connection.drizzle,
    secret: AUTH_SECRET,
    trustedOrigins: [BASE_URL],
  })

  const key = await auth.api.createApiKey({ body: { userId: user.id, name: 'Release agent' } })
  await connection.close()

  return { projectId: project.id, agentKey: key.key }
}

async function waitForServer(log: string) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const ready = await fetch(`${BASE_URL}/api/v1/openapi.json`)
      .then((response) => response.ok)
      .catch(() => false)

    if (ready) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`The test server did not start. See ${log}`)
}

export default async function setup(project: TestProject) {
  await resetDatabase()
  const { projectId, agentKey } = await seed()
  const directory = await mkdtemp(join(tmpdir(), 'glot-test-'))
  const log = join(directory, 'server.log')
  const output = createWriteStream(log)

  const server = spawn('bunx', ['nuxt', 'dev', '--port', String(PORT)], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !/^(?:VITEST|TEST$|NODE_ENV$)/u.test(name)),
      ),
      DATABASE_URL,
      AUTH_SECRET,
      APP_URL: BASE_URL,
      GLOT_VERSION: 'test',
    },
  })

  server.stdout.pipe(output)
  server.stderr.pipe(output)
  await waitForServer(log)

  project.provide('baseUrl', BASE_URL)
  project.provide('serverLog', log)
  project.provide('projectId', projectId)
  project.provide('agentKey', agentKey)

  return () => {
    server.kill()
  }
}

declare module 'vite-plus/test' {
  export interface ProvidedContext {
    baseUrl: string
    serverLog: string
    projectId: string
    agentKey: string
  }
}
