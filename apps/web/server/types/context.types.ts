import type { AuthenticatedActor } from '@glot/auth'
import type { Database } from '@glot/database'
import type { CatalogService } from '../domains/catalogs/services/catalog.service.ts'

export interface RequestContext {
  actor: AuthenticatedActor
  db: Database
  catalog: CatalogService
}
