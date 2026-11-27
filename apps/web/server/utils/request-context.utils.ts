import type { AuthenticatedActor } from '@glot/auth'
import { ai } from '../config/ai.config.ts'
import { auth } from '../config/auth.config.ts'
import { catalog, git } from '../config/catalog.config.ts'
import { database } from '../config/database.config.ts'
import type { RequestContext } from '../types/context.types.ts'

export function toRequestContext(actor: AuthenticatedActor): RequestContext {
  return { actor, auth, db: database.db, catalog, git, ai }
}
