import { better } from 'better-drizzle'
import { timestamps } from 'better-drizzle/timestamps'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { relations } from '../schemas/database.relations.ts'
import type { CreateDatabaseOptions } from '../types/database.types.ts'

export function createDatabase(options: CreateDatabaseOptions) {
  const pool = new Pool({
    connectionString: options.connectionString,
    ...(options.connectionTimeoutMs
      ? { connectionTimeoutMillis: options.connectionTimeoutMs }
      : {}),
    ...(options.idleTimeoutMs ? { idleTimeoutMillis: options.idleTimeoutMs } : {}),
    ...(options.maxConnections ? { max: options.maxConnections } : {}),
  })

  const drizzleDatabase = drizzle({ client: pool, relations })
  const db = better(drizzleDatabase, { plugins: [timestamps()] })

  return {
    db,
    drizzle: drizzleDatabase,
    pool,
    close: () => pool.end(),
  }
}
