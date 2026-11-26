import type { ValueOf } from '@glot/utils/types'
import type { ACTOR_KINDS } from '../constants/auth.constants.ts'
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

export type ActorKind = ValueOf<typeof ACTOR_KINDS>

export type AuthenticatedActor =
  | { kind: typeof ACTOR_KINDS.PERSON; user: AuthenticatedUser; sessionId: string }
  | { kind: typeof ACTOR_KINDS.KEY; userId: string; keyId: string }
