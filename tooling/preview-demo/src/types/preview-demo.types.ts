import type * as z from 'zod'
import type {
  PREVIEW_DEMO_BRANDS,
  PREVIEW_DEMO_TEMPLATES,
} from '../constants/preview-demo.constants.ts'
import type { renderRequestSchema } from '../validators/preview-demo.validator.ts'

export type RenderRequest = z.infer<typeof renderRequestSchema>

export type DemoBrand = (typeof PREVIEW_DEMO_BRANDS)[keyof typeof PREVIEW_DEMO_BRANDS]

export type DemoTemplate = (typeof PREVIEW_DEMO_TEMPLATES)[keyof typeof PREVIEW_DEMO_TEMPLATES]
