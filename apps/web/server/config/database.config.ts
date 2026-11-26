import { createDatabase } from '@glot/database/server'
import { env } from '../env.ts'

export const database = createDatabase({ connectionString: env.DATABASE_URL })
