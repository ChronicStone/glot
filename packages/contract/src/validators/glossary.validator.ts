import { glossaryTermStatusSchema } from '@glot/database/validators/glossary'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'
import { textRefInputSchema } from './texts.validator.ts'

export const glossaryTermSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  status: glossaryTermStatusSchema,
  neverTranslate: z.boolean(),
  terms: z.record(
    languageCodeSchema,
    z.object({ term: z.string(), plural: z.string().nullable(), avoid: z.array(z.string()) }),
  ),
})

export const glossaryListInputSchema = textRefInputSchema.pick({ projectId: true }).extend({
  language: languageCodeSchema.optional(),
  status: glossaryTermStatusSchema.optional(),
})
