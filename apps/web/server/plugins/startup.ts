import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { auth } from '../config/auth.config.ts'
import { database } from '../config/database.config.ts'
import { env } from '../env.ts'

export default defineNitroPlugin(async () => {
  if (env.MIGRATIONS_FOLDER) {
    await migrate(database.drizzle, { migrationsFolder: env.MIGRATIONS_FOLDER })
  }

  const link = await auth.api.issueSetupLink()

  if (link) {
    console.warn(`Open this link to create the first administrator: ${link.url}`)
  }
})
