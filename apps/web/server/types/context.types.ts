import type { AuthenticatedActor, GlotAuth } from '@glot/auth'
import type { Database } from '@glot/database'
import type { CatalogService } from '../domains/catalogs/services/catalog.service.ts'

export interface RequestContext {
  actor: AuthenticatedActor
  auth: GlotAuth
  db: Database
  catalog: CatalogService
}
