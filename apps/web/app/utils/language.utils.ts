const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function languageName(code: string) {
  return languageNames.of(code) ?? code
}
