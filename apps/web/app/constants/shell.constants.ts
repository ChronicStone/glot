export const APPEARANCES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
} as const

export const APPEARANCE_LABELS = {
  [APPEARANCES.SYSTEM]: 'Match the system',
  [APPEARANCES.LIGHT]: 'Light',
  [APPEARANCES.DARK]: 'Dark',
} as const

export const APPEARANCE_STORAGE_KEY = 'glot-appearance'

export const PROJECT_SECTIONS = {
  TEXTS: 'texts',
  EMAILS: 'emails',
  RELEASES: 'releases',
} as const

export const PROJECT_SECTION_LABELS = {
  [PROJECT_SECTIONS.TEXTS]: 'Texts',
  [PROJECT_SECTIONS.EMAILS]: 'Emails & documents',
  [PROJECT_SECTIONS.RELEASES]: 'Releases',
} as const
