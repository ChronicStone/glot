import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ACTOR_KINDS, createGlotAuth } from '@glot/auth'
import type { SendMagicLinkEmail } from '@glot/auth/types/email'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'
import { PeopleService } from '../server/domains/people/services/people.service.ts'
import { dropDatabase } from './support/database.ts'

const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const DATABASE_NAME = `glot_invitations_${process.pid}`
const admin = new Client({ connectionString: ADMIN_URL })

const connection = createDatabase({
  connectionString: ADMIN_URL.replace(/\/glot$/u, `/${DATABASE_NAME}`),
})

let root = ''
let workspaceId = ''
let send: SendMagicLinkEmail = () => Promise.resolve()

const auth = createGlotAuth({
  baseURL: 'http://localhost:3999',
  database: connection.drizzle,
  secret: 'glot-invitations-test-secret-at-least-32-characters',
  trustedOrigins: ['http://localhost:3999'],
  sendMagicLinkEmail: (message) => send(message),
})

function peopleService() {
  const reader = new LocalGitReader({ root })

  return new PeopleService({
    actor: {
      kind: ACTOR_KINDS.PERSON,
      sessionId: 'session',
      user: { id: 'user-owner', email: 'owner@x.test', name: 'Owner', image: null, locale: 'en' },
    },
    auth,
    db: connection.db,
    catalog: new CatalogService({ reader }),
    git: reader,
  })
}

function invitation(email: string) {
  return { workspaceId, email, role: WORKSPACE_ROLES.WRITER, languages: ['pl'] }
}

async function memberships(email: string) {
  return connection.db.workspaceMemberships.count({
    where: { workspaceId, user: { is: { email } } },
  })
}

beforeAll(async () => {
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${DATABASE_NAME} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${DATABASE_NAME}`)
  root = await mkdtemp(join(tmpdir(), 'glot-invitations-'))

  await migrate(connection.drizzle, {
    migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
  })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'People', slug: 'people' },
  })

  const owner = await connection.db.user.create({
    data: { id: 'user-owner', name: 'Owner', email: 'owner@x.test', emailVerified: true },
  })

  await connection.db.workspaceMemberships.create({
    data: { workspaceId: workspace.id, userId: owner.id, role: WORKSPACE_ROLES.OWNER },
  })

  workspaceId = workspace.id
})

afterAll(async () => {
  await connection.close()
  await dropDatabase({ admin, name: DATABASE_NAME })
  await admin.end()
  await rm(root, { recursive: true, force: true })
})

test('the sign-in link is sent once the membership is committed', async () => {
  let committedAtSend: boolean | undefined

  send = async ({ to }) => {
    committedAtSend = (await memberships(to)) === 1
  }

  await peopleService().invite(invitation('committed@x.test'))

  expect(committedAtSend).toBe(true)
})

test('when the link cannot be sent, a new person leaves no user and no membership behind', async () => {
  send = () => Promise.reject(new Error('mail is down'))

  await expect(peopleService().invite(invitation('nobody@x.test'))).rejects.toMatchObject({
    code: 'BAD_GATEWAY',
  })

  expect(await memberships('nobody@x.test')).toBe(0)
  expect(await connection.db.user.exists({ where: { email: 'nobody@x.test' } })).toBe(false)
})

test('when the link cannot be sent, an existing person keeps their account but gets no access', async () => {
  await connection.db.user.create({
    data: { id: 'user-known', name: 'Known', email: 'known@x.test', emailVerified: true },
  })

  send = () => Promise.reject(new Error('mail is down'))

  await expect(peopleService().invite(invitation('known@x.test'))).rejects.toMatchObject({
    code: 'BAD_GATEWAY',
  })

  expect(await memberships('known@x.test')).toBe(0)
  expect(await connection.db.user.exists({ where: { email: 'known@x.test' } })).toBe(true)
})
