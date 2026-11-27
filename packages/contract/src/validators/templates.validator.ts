import { textStateSchema } from '@glot/database/validators/texts'
import * as z from 'zod'
import { TEMPLATE_KINDS } from '../constants/contract.constants.ts'
import { languageCodeSchema } from './languages.validator.ts'
import { textRefInputSchema } from './texts.validator.ts'

export const templateKindSchema = z.enum(TEMPLATE_KINDS)

export const templateBrandSchema = z.object({
  id: z.string(),
  name: z.string().describe('The brand as people call it, such as Agorastore Immo.'),
})

export const templateSummarySchema = z.object({
  id: z.string(),
  name: z.string().describe('The template as people call it, such as Outbid.'),
  group: z.string().describe('The group it is listed under, such as Bidding.'),
  kind: templateKindSchema,
  texts: z.number().int().describe('How many texts the template uses for the first brand.'),
  state: textStateSchema.describe(
    'The worst state of its texts in any language for the first brand: MISSING before NEEDS_FIX before TO_CHECK before REVIEWED.',
  ),
})

export const templateListInputSchema = textRefInputSchema.pick({ projectId: true })

export const templateListSchema = z.object({
  available: z
    .boolean()
    .describe(
      'False when the preview adapter did not answer: the list is the last one Glot received and previews fail until it answers again.',
    ),
  brands: z.array(templateBrandSchema),
  templates: z.array(templateSummarySchema),
  sendTest: z.boolean().describe('True when the adapter can send a test of a template.'),
})

export const templateRefInputSchema = templateListInputSchema.extend({
  templateId: templateSummarySchema.shape.id,
  brand: templateBrandSchema.shape.id,
})

export const templatePreviewInputSchema = templateRefInputSchema.extend({
  language: languageCodeSchema,
  overrides: z
    .array(z.object({ textId: z.string(), value: z.string() }))
    .max(200)
    .default([])
    .describe(
      'Values to show instead of the current ones, such as what is being typed. Drafts are shown without being listed here.',
    ),
})

export const templatePreviewSchema = z.object({
  kind: templateKindSchema,
  subject: z.string().nullable(),
  from: z.string().nullable(),
  html: z
    .string()
    .nullable()
    .describe(
      'The rendered email or document, each text wrapped in an element with data-glot-text set to its text id. Show it in a sandboxed frame.',
    ),
  text: z.string().nullable().describe('The rendered SMS.'),
})

export const templateSendTestInputSchema = templateRefInputSchema.extend({
  language: languageCodeSchema,
})

export const templateSendTestSchema = z.object({
  to: z.email().describe('Where the test was sent: the address of the person who asked.'),
})
