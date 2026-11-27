import type * as z from 'zod'
import type {
  adapterCatalogSchema,
  adapterRenderSchema,
} from '../validators/preview-adapter.validator.ts'

export type AdapterCatalog = z.infer<typeof adapterCatalogSchema>

export type AdapterBrand = AdapterCatalog['brands'][number]

export type AdapterTemplate = AdapterCatalog['templates'][number]

export type AdapterRender = z.infer<typeof adapterRenderSchema>

export interface AdapterText {
  id: string
  path: string[]
  value: string
}

export interface AdapterRenderRequest {
  template: string
  brand: string
  language: string
  texts: AdapterText[]
}
