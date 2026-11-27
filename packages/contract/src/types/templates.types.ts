import type * as z from 'zod'
import type {
  templateBrandSchema,
  templateListInputSchema,
  templateListSchema,
  templatePreviewInputSchema,
  templatePreviewSchema,
  templateRefInputSchema,
  templateSendTestInputSchema,
  templateSendTestSchema,
  templateSummarySchema,
} from '../validators/templates.validator.ts'

export type TemplateBrand = z.infer<typeof templateBrandSchema>

export type TemplateSummary = z.infer<typeof templateSummarySchema>

export type TemplateListInput = z.infer<typeof templateListInputSchema>

export type TemplateList = z.infer<typeof templateListSchema>

export type TemplateRefInput = z.infer<typeof templateRefInputSchema>

export type TemplatePreviewInput = z.infer<typeof templatePreviewInputSchema>

export type TemplatePreview = z.infer<typeof templatePreviewSchema>

export type TemplateSendTestInput = z.infer<typeof templateSendTestInputSchema>

export type TemplateSendTest = z.infer<typeof templateSendTestSchema>
