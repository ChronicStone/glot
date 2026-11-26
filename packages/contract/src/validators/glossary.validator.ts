import { glossaryTermStatusSchema } from '@glot/database/validators/glossary'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

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

export const glossaryListInputSchema = z.object({
  language: languageCodeSchema.optional(),
  status: glossaryTermStatusSchema.optional(),
})
