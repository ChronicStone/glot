import type { user } from '../schemas/users/users.schema.ts'

export type User = typeof user.$inferSelect

export type UserInsert = typeof user.$inferInsert
