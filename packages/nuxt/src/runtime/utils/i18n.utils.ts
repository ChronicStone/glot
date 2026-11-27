import type { Composer } from 'vue-i18n'

export function isComposer(value: unknown): value is Composer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'setPostTranslationHandler' in value &&
    'getPostTranslationHandler' in value &&
    'mergeLocaleMessage' in value
  )
}

export function canSetLocale(
  composer: Composer,
): composer is Composer & { setLocale: (code: string) => Promise<void> } {
  return 'setLocale' in composer && typeof composer.setLocale === 'function'
}
