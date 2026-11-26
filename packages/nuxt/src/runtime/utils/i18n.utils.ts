import type { Composer } from 'vue-i18n'

export function isComposer(value: unknown): value is Composer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'setPostTranslationHandler' in value &&
    'getPostTranslationHandler' in value
  )
}
