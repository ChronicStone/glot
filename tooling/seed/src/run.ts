import { resolve } from 'node:path'
import { createDatabase } from '@glot/database/server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { seedDemoRepository } from './demo-repository.ts'
import { seedDemo } from './seed.ts'

const connection = createDatabase({ connectionString: process.env.DATABASE_URL ?? '' })

await migrate(connection.drizzle, {
  migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
})

const { project } = await seedDemo(connection.db)

const { directory } = await seedDemoRepository({
  root: resolve(process.env.GLOT_GIT_ROOT || '.data/repositories'),
})

console.warn(`Seeded the demo project ${project.id} and its repository ${directory}`)

await connection.close()
