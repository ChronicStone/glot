const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function languageName(code: string) {
  return languageNames.of(code) ?? code
}

export function nativeLanguageName(code: string) {
  try {
    const native = new Intl.DisplayNames([code], { type: 'language' }).of(code)

    return native && native !== languageName(code) ? native : ''
  } catch {
    return ''
  }
}
