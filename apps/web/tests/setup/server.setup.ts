import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGlotAuth } from '@glot/auth'
import { createDatabase } from '@glot/database/server'
import { seedDemo } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import type { TestProject } from 'vite-plus/test/node'
import { WIDGET_TEST_ORIGINS } from '../fixtures/widget.fixtures.ts'
import { startAiSink } from '../support/ai-sink.ts'

const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const PORT = Number(process.env.GLOT_TEST_PORT ?? 3199)
const DATABASE_NAME = `glot_test_${PORT}`
const DATABASE_URL = ADMIN_URL.replace(/\/glot$/u, `/${DATABASE_NAME}`)
const BASE_URL = `http://localhost:${PORT}`
const AUTH_SECRET = 'glot-test-secret-that-is-at-least-32-characters'
const PLAYGROUND_URL = `http://localhost:${PORT + 1}`

async function resetDatabase() {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${DATABASE_NAME} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${DATABASE_NAME}`)
  await admin.end()
}

async function seed(options: { repositories: string }) {
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

  const { directory } = await seedDemoRepository({ root: options.repositories })

  return { projectId: project.id, agentKey: key.key, repositoryPath: directory }
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
  const directory = await mkdtemp(join(tmpdir(), 'glot-test-'))
  const repositories = join(directory, 'repositories')
  const { projectId, agentKey, repositoryPath } = await seed({ repositories })
  const sink = await startAiSink()
  const log = join(directory, 'server.log')
  const output = createWriteStream(log)

  const server = spawn('bunx', ['nuxt', 'dev', '--port', String(PORT)], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !/^(?:VITEST|TEST$|NODE_ENV$)/u.test(name)),
      ),
      NUXT_IGNORE_LOCK: '1',
      GLOT_BUILD_DIR: join(directory, 'nuxt'),
      DATABASE_URL,
      AUTH_SECRET,
      APP_URL: BASE_URL,
      GLOT_GIT_ROOT: repositories,
      GLOT_VERSION: 'test',
      WIDGET_ORIGINS: `${PLAYGROUND_URL},${WIDGET_TEST_ORIGINS.UAT},${WIDGET_TEST_ORIGINS.PRODUCTION}`,
      WIDGET_PRODUCTION_ORIGINS: WIDGET_TEST_ORIGINS.PRODUCTION,
      ANTHROPIC_BASE_URL: sink.url,
      OPENAI_BASE_URL: sink.url,
    },
  })

  server.stdout.pipe(output)
  server.stderr.pipe(output)
  await waitForServer(log)

  project.provide('baseUrl', BASE_URL)
  project.provide('serverLog', log)
  project.provide('projectId', projectId)
  project.provide('agentKey', agentKey)
  project.provide('repositoryPath', repositoryPath)
  project.provide('repositoriesRoot', repositories)
  project.provide('databaseUrl', DATABASE_URL)
  project.provide('playgroundUrl', PLAYGROUND_URL)
  project.provide('aiSinkUrl', sink.url)
  project.provide('authSecret', AUTH_SECRET)

  return async () => {
    server.kill()
    await sink.close()
    await rm(directory, { recursive: true, force: true })
  }
}

declare module 'vite-plus/test' {
  export interface ProvidedContext {
    baseUrl: string
    serverLog: string
    projectId: string
    agentKey: string
    repositoryPath: string
    repositoriesRoot: string
    databaseUrl: string
    playgroundUrl: string
    aiSinkUrl: string
    authSecret: string
  }
}
