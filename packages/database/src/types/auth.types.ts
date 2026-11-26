import type { apiKeys, session } from '../schemas/auth/auth.schema.ts'

export type Session = typeof session.$inferSelect

export type ApiKey = typeof apiKeys.$inferSelect
