import type { GlossaryTerm } from '@glot/contract'
import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'
import type { GlossaryWords } from '../types/glossary.types.ts'

export function wordsOf(concepts: GlossaryTerm[]): GlossaryWords {
  const avoid: Record<string, string[]> = {}
  const keep = new Set<string>()

  for (const concept of concepts) {
    if (concept.status !== GLOSSARY_TERM_STATUSES.VALIDATED) {
      continue
    }

    for (const [language, words] of Object.entries(concept.terms)) {
      avoid[language] = [...(avoid[language] ?? []), ...words.avoid]

      if (concept.neverTranslate) {
        keep.add(words.term)

        if (words.plural) {
          keep.add(words.plural)
        }
      }
    }
  }

  return { avoid, keep: [...keep] }
}
