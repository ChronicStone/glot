import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import * as z from 'zod'
import { GLOSSARY_TERM_STATUSES } from '../constants/glossary.constants.ts'
import { glossaryConceptTerms, glossaryConcepts } from '../schemas/glossary/glossary.schema.ts'

export const glossaryTermStatusSchema = z.enum(GLOSSARY_TERM_STATUSES)

export const glossaryConceptSelectSchema = createSelectSchema(glossaryConcepts, {
  status: glossaryTermStatusSchema,
})

export const glossaryConceptInsertSchema = createInsertSchema(glossaryConcepts, {
  status: glossaryTermStatusSchema,
})

export const glossaryConceptTermSelectSchema = createSelectSchema(glossaryConceptTerms)

export const glossaryConceptTermInsertSchema = createInsertSchema(glossaryConceptTerms)
