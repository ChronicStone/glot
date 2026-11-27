import type { StateCounts, Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'

export function emptyCounts(): StateCounts {
  return {
    [TEXT_STATES.REVIEWED]: 0,
    [TEXT_STATES.TO_CHECK]: 0,
    [TEXT_STATES.NEEDS_FIX]: 0,
    [TEXT_STATES.MISSING]: 0,
  }
}

export function progressOf(options: { texts: Text[]; languages: string[] }) {
  const total = emptyCounts()
  const perLanguage = new Map(options.languages.map((language) => [language, emptyCounts()]))

  for (const text of options.texts) {
    for (const { language, state } of text.translations) {
      const counts = perLanguage.get(language)

      if (counts) {
        counts[state] += 1
        total[state] += 1
      }
    }
  }

  return {
    counts: total,
    languages: options.languages.map((language) => ({
      language,
      counts: perLanguage.get(language) ?? emptyCounts(),
    })),
  }
}
