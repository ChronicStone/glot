import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDatabase } from '@glot/database/server'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { hashText } from '@glot/utils/hash'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'
import { CatalogService } from '../server/domains/catalogs/services/catalog.service.ts'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'
import type { GitPublication } from '../server/domains/catalogs/types/catalog.types.ts'
import { ReleaseRunnerService } from '../server/domains/releases/services/release-runner.service.ts'
import { dropDatabase } from './support/database.ts'

const ADMIN_URL = process.env.GLOT_TEST_ADMIN_URL ?? 'postgres://glot:glot@localhost:54329/glot'
const DATABASE_NAME = `glot_integrity_${process.pid}`
const admin = new Client({ connectionString: ADMIN_URL })

const connection = createDatabase({
  connectionString: ADMIN_URL.replace(/\/glot$/u, `/${DATABASE_NAME}`),
})

let root = ''

beforeAll(async () => {
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${DATABASE_NAME} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${DATABASE_NAME}`)
  root = await mkdtemp(join(tmpdir(), 'glot-integrity-'))

  await migrate(connection.drizzle, {
    migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
  })
})

afterAll(async () => {
  await connection.close()
  await dropDatabase({ admin, name: DATABASE_NAME })
  await admin.end()
  await rm(root, { recursive: true, force: true })
})

async function seedProject(repository: string) {
  const { db } = connection
  const workspace = await db.workspaces.create({ data: { name: repository, slug: repository } })

  const user = await db.user.create({
    data: {
      id: `user-${repository}`,
      name: 'Ada',
      email: `${repository}@x.test`,
      emailVerified: true,
    },
  })

  const project = await seedDemoProject(db, { workspaceId: workspace.id, repository })

  await seedDemoRepository({ root, repository })

  const reader = new LocalGitReader({ root })
  const catalog = new CatalogService({ reader })
  const sources = await db.projectSources.findMany({ where: { projectId: project.id } })
  const full = { ...project, sources }
  const { entries } = await catalog.read(full)
  const save = entries.find(({ sourceValue }) => sourceValue === 'Enregistrer')

  if (!save) throw new Error('The seeded repository has no Enregistrer')

  const base = await catalog.base({ project: full, textId: save.id, language: 'pl' })

  return { project, user, reader, catalog, save, base }
}

test('a text holds at most one approved draft per language', async () => {
  const { project, user, save, base } = await seedProject('glot/one-approved')

  const draft = (value: string) => ({
    projectId: project.id,
    textId: save.id,
    language: 'pl',
    value,
    authorId: user.id,
    status: 'APPROVED' as const,
    ...base,
  })

  await connection.db.drafts.create({ data: draft('Zapisz') })

  await expect(connection.db.drafts.create({ data: draft('Zachowaj') })).rejects.toMatchObject({
    cause: { code: '23505', constraint: 'draft_approved_unique' },
  })
})

test('a release that cannot be recorded never reaches git', async () => {
  const { project, user, reader, catalog, save, base } = await seedProject('glot/never-published')

  await connection.pool.query(
    `create function reject_poison() returns trigger language plpgsql as $$ begin raise exception 'poison'; end $$`,
  )

  await connection.pool.query(
    `create trigger release_change_poison before insert on release_change for each row when (new.value = 'Poison') execute function reject_poison()`,
  )

  await connection.db.drafts.create({
    data: {
      projectId: project.id,
      textId: save.id,
      language: 'pl',
      value: 'Poison',
      authorId: user.id,
      status: 'APPROVED',
      ...base,
    },
  })

  await connection.db.approvals.create({
    data: {
      projectId: project.id,
      textId: save.id,
      language: 'pl',
      sourceHash: save.sourceHash,
      targetHash: hashText('Poison'),
      reviewerId: user.id,
    },
  })

  const published: GitPublication[] = []

  const runner = new ReleaseRunnerService({
    db: connection.db,
    catalog,
    git: {
      head: (options) => reader.head(options),
      files: (options) => reader.files(options),
      publish: (options) => {
        published.push(options)

        return reader.publish(options)
      },
    },
  })

  const sources = await connection.db.projectSources.findMany({ where: { projectId: project.id } })

  await expect(
    runner.run({ project: { ...project, sources }, trigger: 'MANUAL', startedById: null }),
  ).rejects.toThrow('poison')

  expect(published).toHaveLength(0)
  expect(await connection.db.releases.count({ where: { projectId: project.id } })).toBe(0)
})
