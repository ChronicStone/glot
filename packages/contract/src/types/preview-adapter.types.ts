import type * as z from 'zod'
import type {
  previewAdapterCatalogSchema,
  previewAdapterRenderRequestSchema,
  previewAdapterRenderSchema,
  previewAdapterSendTestRequestSchema,
} from '../validators/preview-adapter.validator.ts'

export type PreviewAdapterCatalog = z.infer<typeof previewAdapterCatalogSchema>

export type PreviewAdapterBrand = PreviewAdapterCatalog['brands'][number]

export type PreviewAdapterTemplate = PreviewAdapterCatalog['templates'][number]

export type PreviewAdapterRenderRequest = z.infer<typeof previewAdapterRenderRequestSchema>

export type PreviewAdapterSendTestRequest = z.infer<typeof previewAdapterSendTestRequestSchema>

export type PreviewAdapterRender = z.infer<typeof previewAdapterRenderSchema>
