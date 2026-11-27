import type { AuthenticatedActor, GlotAuth } from '@glot/auth'
import type { Database } from '@glot/database'
import type { CatalogService } from '../domains/catalogs/services/catalog.service.ts'
import type { GitReader, GitWriter } from '../domains/catalogs/types/catalog.types.ts'
import type { WidgetScope } from '../domains/widget/types/widget.types.ts'

export interface RequestContext {
  actor: AuthenticatedActor
  auth: GlotAuth
  db: Database
  catalog: CatalogService
  git: GitReader & GitWriter
  widget?: WidgetScope
}
