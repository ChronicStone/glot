import type { ValueOf } from '@glot/utils/types'
import type { GLOSSARY_TERM_STATUSES } from '../constants/glossary.constants.ts'
import type { glossaryConceptTerms, glossaryConcepts } from '../schemas/glossary/glossary.schema.ts'

export type GlossaryTermStatus = ValueOf<typeof GLOSSARY_TERM_STATUSES>

export type GlossaryConcept = typeof glossaryConcepts.$inferSelect

export type GlossaryConceptTerm = typeof glossaryConceptTerms.$inferSelect
