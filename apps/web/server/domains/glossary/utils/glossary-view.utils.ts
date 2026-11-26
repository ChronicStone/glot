import type { GlossaryTerm } from '@glot/contract'
import type { GlossaryConcept, GlossaryConceptTerm } from '@glot/database/types/glossary'

export function toGlossaryTerm(concept: GlossaryConcept & { terms: GlossaryConceptTerm[] }) {
  return {
    id: concept.id,
    name: concept.name,
    definition: concept.definition,
    status: concept.status,
    neverTranslate: concept.neverTranslate,
    notes: concept.notes,
    terms: Object.fromEntries(
      concept.terms.map(({ language, term, plural, avoid }) => [language, { term, plural, avoid }]),
    ),
  } satisfies GlossaryTerm
}
