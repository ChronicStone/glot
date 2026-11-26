import type { DrizzleDatabase } from '@glot/database/types/database'
import type { User } from '@glot/database/types/users'
import type { createGlotAuth } from '../create-auth.ts'
import type { SendMagicLinkEmail } from './email.types.ts'

export interface CreateAuthOptions {
  baseURL: string
  database: DrizzleDatabase
  secret: string
  trustedOrigins: string[]
  google?: { clientId: string; clientSecret: string }
  sendMagicLinkEmail?: SendMagicLinkEmail
}

export type GlotAuth = ReturnType<typeof createGlotAuth>

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'name' | 'image' | 'locale'>

export type AuthenticatedActor =
  | { kind: 'person'; user: AuthenticatedUser; sessionId: string }
  | { kind: 'key'; userId: string; keyId: string }
