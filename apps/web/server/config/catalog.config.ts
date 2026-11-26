import { DEMO_CATALOG } from '../domains/catalogs/fixtures/demo.fixtures.ts'
import { CatalogService } from '../domains/catalogs/services/catalog.service.ts'

export const catalog = new CatalogService(DEMO_CATALOG)
