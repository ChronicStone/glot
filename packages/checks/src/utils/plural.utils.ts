import { PLURAL_CATEGORIES, PLURAL_SAMPLED_COUNTS } from '../constants/plural.constants.ts'

export function integerPluralCategories(language: string): string[] {
  try {
    const rules = new Intl.PluralRules(language)

    const used = new Set(
      Array.from({ length: PLURAL_SAMPLED_COUNTS }, (_, count) => rules.select(count)),
    )

    return Object.values(PLURAL_CATEGORIES).filter((category) => used.has(category))
  } catch {
    return [PLURAL_CATEGORIES.OTHER]
  }
}
