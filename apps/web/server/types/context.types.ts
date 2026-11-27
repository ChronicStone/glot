import type { AuthenticatedActor, GlotAuth } from '@glot/auth'
import type { Database } from '@glot/database'
import type { AiRuntime } from '../domains/ai/types/ai.types.ts'
import type { CatalogService } from '../domains/catalogs/services/catalog.service.ts'
import type { GitReader, GitWriter } from '../domains/catalogs/types/catalog.types.ts'
import type { PreviewAdapterService } from '../domains/templates/services/preview-adapter.service.ts'
import type { WidgetScope } from '../domains/widget/types/widget.types.ts'

export interface RequestContext {
  actor: AuthenticatedActor
  auth: GlotAuth
  db: Database
  catalog: CatalogService
  git: GitReader & GitWriter
  widget?: WidgetScope
  ai: AiRuntime
  previews: PreviewAdapterService
}
