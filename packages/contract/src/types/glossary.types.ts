import type * as z from 'zod'
import type { glossaryTermSchema } from '../validators/glossary.validator.ts'

export type GlossaryTerm = z.infer<typeof glossaryTermSchema>
