import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'

export const GLOSSARY_STATUS_PILLS = {
  [GLOSSARY_TERM_STATUSES.VALIDATED]: {
    tone: 'ok',
    icon: 'i-lucide-check',
    label: 'Validated',
    rank: 0,
  },
  [GLOSSARY_TERM_STATUSES.SUGGESTED]: {
    tone: 'check',
    icon: 'i-lucide-lightbulb',
    label: 'Suggested',
    rank: 1,
  },
  [GLOSSARY_TERM_STATUSES.TURNED_DOWN]: {
    tone: 'miss',
    icon: 'i-lucide-x',
    label: 'Turned down',
    rank: 2,
  },
} as const

export const GLOSSARY_FILTERS = {
  ALL: 'ALL',
  ...GLOSSARY_TERM_STATUSES,
} as const
