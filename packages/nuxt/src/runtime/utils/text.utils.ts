import type { Text, Translation } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'

export function translationIn(options: { text: Text; language: string }): Translation | undefined {
  const found = options.text.translations.find((entry) => entry.language === options.language)

  if (found || options.text.source.language !== options.language) {
    return found
  }

  return {
    language: options.language,
    value: options.text.source.value,
    state: TEXT_STATES.REVIEWED,
    failures: [],
    reviewedBy: null,
    reviewerName: null,
    selfApproved: false,
    aiWritten: false,
    draft: null,
  }
}
