import type { AuthenticatedActor } from '@glot/auth'
import { catalog } from '../config/catalog.config.ts'
import { database } from '../config/database.config.ts'
import type { RequestContext } from '../types/context.types.ts'

export function toRequestContext(actor: AuthenticatedActor): RequestContext {
  return { actor, db: database.db, catalog }
}
