import type * as z from 'zod'
import type {
  glossaryListInputSchema,
  glossaryTermSchema,
} from '../validators/glossary.validator.ts'

export type GlossaryTerm = z.infer<typeof glossaryTermSchema>

export type GlossaryListInput = z.infer<typeof glossaryListInputSchema>
