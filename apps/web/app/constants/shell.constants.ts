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

export const PROJECT_SECTIONS = {
  TEXTS: 'texts',
  REVIEW: 'review',
  EMAILS: 'emails',
  RELEASES: 'releases',
} as const

export const PROJECT_SECTION_LABELS = {
  [PROJECT_SECTIONS.TEXTS]: 'Texts',
  [PROJECT_SECTIONS.REVIEW]: 'Review',
  [PROJECT_SECTIONS.EMAILS]: 'Emails & documents',
  [PROJECT_SECTIONS.RELEASES]: 'Releases',
} as const

export const PROJECT_SECTION_ICONS = {
  [PROJECT_SECTIONS.TEXTS]: 'i-lucide-file-text',
  [PROJECT_SECTIONS.REVIEW]: 'i-lucide-list-checks',
  [PROJECT_SECTIONS.EMAILS]: 'i-lucide-mail',
  [PROJECT_SECTIONS.RELEASES]: 'i-lucide-rocket',
} as const
