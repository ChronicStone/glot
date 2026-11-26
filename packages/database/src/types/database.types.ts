import type { createDatabase } from '../server/database.ts'

export interface CreateDatabaseOptions {
  connectionString: string
  connectionTimeoutMs?: number
  idleTimeoutMs?: number
  maxConnections?: number
}

export type DatabaseConnection = ReturnType<typeof createDatabase>

export type Database = DatabaseConnection['db']

export type DrizzleDatabase = DatabaseConnection['drizzle']

export type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
