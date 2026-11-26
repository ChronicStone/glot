import { createDatabase } from '@glot/database/server'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { seedDemo } from './seed.ts'

const connection = createDatabase({ connectionString: process.env.DATABASE_URL ?? '' })

await migrate(connection.drizzle, {
  migrationsFolder: new URL('../../../packages/database/migrations', import.meta.url).pathname,
})

const { project } = await seedDemo(connection.db)

console.warn(`Seeded the demo project ${project.id}`)

await connection.close()
