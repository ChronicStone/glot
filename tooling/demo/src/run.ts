import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { createDatabase } from '@glot/database/server'
import { startPreviewDemo } from '@glot/preview-demo'
import { seedDemoRepository } from '@glot/seed/repository'
import { seedDemo } from '@glot/seed'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import {
  DEMO_DATABASE,
  DEMO_PEOPLE,
  DEMO_PORTS,
  DEMO_POSTGRES_URL,
  DEMO_REPOSITORIES_FOLDER,
} from './constants/demo.constants.ts'
import { startService, waitForUrl } from './utils/demo.utils.ts'

const root = resolve(import.meta.dirname, '../../..')
const offset = Number(process.env.GLOT_DEMO_OFFSET ?? 0)
const suffix = offset ? `-${offset}` : ''
const database = offset ? `${DEMO_DATABASE}_${offset}` : DEMO_DATABASE
const databaseUrl = `${DEMO_POSTGRES_URL}/${database}`
const repositories = resolve(root, `${DEMO_REPOSITORIES_FOLDER}${suffix}`)
const glotUrl = `http://localhost:${DEMO_PORTS.GLOT + offset}`
const appUrl = `http://localhost:${DEMO_PORTS.APP + offset}`

execFileSync('docker', ['compose', '-p', 'glot', 'up', '-d', '--wait', 'postgres'], {
  cwd: root,
  stdio: 'inherit',
})

const admin = new pg.Client({ connectionString: `${DEMO_POSTGRES_URL}/glot` })

await admin.connect()

await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`)

await admin.query(`CREATE DATABASE ${database}`)

await admin.end()

const connection = createDatabase({ connectionString: databaseUrl })

await migrate(connection.drizzle, {
  migrationsFolder: resolve(root, 'packages/database/migrations'),
})

const previews = await startPreviewDemo({
  port: DEMO_PORTS.PREVIEW + offset,
  onTest: (line) => process.stdout.write(`[preview] ${line}\n`),
})

const { project } = await seedDemo(connection.db, { previewUrl: previews.url })

const { directory } = await seedDemoRepository({
  root: repositories,
  withApp: true,
  withEmails: true,
})

await connection.close()

const glot = startService({
  name: 'glot',
  command: ['bunx', 'nuxt', 'dev', '--port', String(DEMO_PORTS.GLOT + offset)],
  cwd: resolve(root, 'apps/web'),
  env: {
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString('hex'),
    APP_URL: glotUrl,
    GLOT_GIT_ROOT: repositories,
    GLOT_CLOCK: 'on',
    WIDGET_ORIGINS: appUrl,
    GLOT_BUILD_DIR: `.nuxt-demo${suffix}`,
    NUXT_IGNORE_LOCK: '1',
  },
})

const app = startService({
  name: 'app',
  command: ['bunx', 'nuxt', 'dev', '--port', String(DEMO_PORTS.APP + offset)],
  cwd: resolve(root, 'apps/demo'),
  env: {
    GLOT_URL: glotUrl,
    GLOT_PROJECT: project.repository,
    GLOT_LOCALES_DIR: directory,
    DEMO_BUILD_DIR: `.nuxt-demo${suffix}`,
    NUXT_IGNORE_LOCK: '1',
  },
})

async function stop(code: number) {
  glot.stop()
  app.stop()
  await previews.close()
  process.exit(code)
}

process.on('SIGINT', () => stop(0))

process.on('SIGTERM', () => stop(0))

await Promise.all([waitForUrl(`${glotUrl}/sign-in`), waitForUrl(`${appUrl}/api/locales/fr`)]).catch(
  async (error: unknown) => {
    process.stderr.write(`${String(error)}\n`)
    await stop(1)
  },
)

process.stdout.write(`
Glot is ready.

  Glot          ${glotUrl}
  Demo app      ${appUrl}/pl/lots/48213?glot
  Emails        ${glotUrl}/projects/${project.id}/emails
  Repository    ${directory}

  Owner         ${DEMO_PEOPLE.OWNER}
  Reviewer      ${DEMO_PEOPLE.REVIEWER} (Polish and German)

Sign in with either address on ${glotUrl}/sign-in: the link prints here.
Press Ctrl+C to stop.
`)
