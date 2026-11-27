import type * as z from 'zod'
import type {
  glossaryConceptCreateInputSchema,
  glossaryConceptRefInputSchema,
  glossaryConceptsInputSchema,
  glossaryConceptUpdateInputSchema,
  glossaryListInputSchema,
  glossaryRightsSchema,
  glossaryStatusInputSchema,
  glossaryTermSchema,
} from '../validators/glossary.validator.ts'

export type GlossaryTerm = z.infer<typeof glossaryTermSchema>

export type GlossaryListInput = z.infer<typeof glossaryListInputSchema>

export type GlossaryConceptsInput = z.infer<typeof glossaryConceptsInputSchema>

export type GlossaryConceptCreateInput = z.infer<typeof glossaryConceptCreateInputSchema>

export type GlossaryConceptRefInput = z.infer<typeof glossaryConceptRefInputSchema>

export type GlossaryConceptUpdateInput = z.infer<typeof glossaryConceptUpdateInputSchema>

export type GlossaryStatusInput = z.infer<typeof glossaryStatusInputSchema>

export type GlossaryRights = z.infer<typeof glossaryRightsSchema>
