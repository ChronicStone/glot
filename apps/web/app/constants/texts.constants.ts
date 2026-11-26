import { TEXT_STATES } from '@glot/database/constants/texts'

export const TEXT_STATE_PRIORITY = {
  [TEXT_STATES.NEEDS_FIX]: 0,
  [TEXT_STATES.TO_CHECK]: 1,
  [TEXT_STATES.MISSING]: 2,
  [TEXT_STATES.REVIEWED]: 3,
} as const

export const TEXT_LIST = {
  ROW_HEIGHT: 52,
  PAGE_SIZE: 100,
} as const

export const TEXT_PANEL_TABS = {
  LANGUAGES: 'Languages',
  HISTORY: 'History',
  DETAILS: 'Details',
} as const
