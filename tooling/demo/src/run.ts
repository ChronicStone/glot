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
  DEMO_MAIL,
  DEMO_PEOPLE,
  DEMO_PORTS,
  DEMO_POSTGRES_URL,
  DEMO_REPOSITORIES_FOLDER,
} from './constants/demo.constants.ts'
import { mergeReleases, startService, waitForUrl } from './utils/demo.utils.ts'

const root = resolve(import.meta.dirname, '../../..')
const offset = Number(process.env.GLOT_DEMO_OFFSET ?? 0)
const suffix = offset ? `-${offset}` : ''
const database = offset ? `${DEMO_DATABASE}_${offset}` : DEMO_DATABASE
const databaseUrl = `${DEMO_POSTGRES_URL}/${database}`
const repositories = resolve(root, `${DEMO_REPOSITORIES_FOLDER}${suffix}`)
const glotUrl = `http://localhost:${DEMO_PORTS.GLOT + offset}`
const appUrl = `http://localhost:${DEMO_PORTS.APP + offset}`

const authSecret = process.env.AUTH_SECRET ?? randomBytes(32).toString('hex')
const smtpUrl = `smtp://127.0.0.1:${process.env.GLOT_SMTP_PORT ?? DEMO_MAIL.SMTP_PORT}`
const inboxUrl = `http://localhost:${process.env.GLOT_MAILPIT_PORT ?? DEMO_MAIL.INBOX_PORT}`

execFileSync('docker', ['compose', '-p', 'glot', 'up', '-d', '--wait', 'postgres', 'mailpit'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, AUTH_SECRET: authSecret },
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
    AUTH_SECRET: authSecret,
    APP_URL: glotUrl,
    GLOT_GIT_ROOT: repositories,
    GLOT_CLOCK: 'on',
    WIDGET_ORIGINS: appUrl,
    SMTP_URL: smtpUrl,
    MAIL_FROM: DEMO_MAIL.FROM,
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

const merger = mergeReleases(directory)

async function stop(code: number) {
  merger.stop()
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
  Inbox         ${inboxUrl}
  Repository    ${directory}
                Released texts are merged into main within seconds, as a developer would merge the pull request.

  Owner         ${DEMO_PEOPLE.OWNER}
  Reviewer      ${DEMO_PEOPLE.REVIEWER} (Polish and German)

Sign in with either address on ${glotUrl}/sign-in: the email lands in the inbox, and the link prints here too.
Press Ctrl+C to stop.
`)
