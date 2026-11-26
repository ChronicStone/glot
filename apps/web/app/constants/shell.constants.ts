export const APPEARANCES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
} as const

export const APPEARANCE_LABELS = {
  [APPEARANCES.SYSTEM]: 'System',
  [APPEARANCES.LIGHT]: 'Light',
  [APPEARANCES.DARK]: 'Dark',
} as const

export const APPEARANCE_ICONS = {
  [APPEARANCES.SYSTEM]: 'i-lucide-monitor',
  [APPEARANCES.LIGHT]: 'i-lucide-sun',
  [APPEARANCES.DARK]: 'i-lucide-moon',
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
  [PROJECT_SECTIONS.TEXTS]: 'i-lucide-text',
  [PROJECT_SECTIONS.REVIEW]: 'i-lucide-list-checks',
  [PROJECT_SECTIONS.EMAILS]: 'i-lucide-mail',
  [PROJECT_SECTIONS.RELEASES]: 'i-lucide-rocket',
} as const
