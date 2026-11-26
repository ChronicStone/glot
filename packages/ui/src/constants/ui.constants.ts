import { TEXT_STATES } from '@glot/database/constants/texts'

export const TEXT_STATE_CLASSES = {
  [TEXT_STATES.REVIEWED]: 'ok',
  [TEXT_STATES.TO_CHECK]: 'check',
  [TEXT_STATES.NEEDS_FIX]: 'fix',
  [TEXT_STATES.MISSING]: 'miss',
} as const

export const TEXT_STATE_ICONS = {
  [TEXT_STATES.REVIEWED]: 'i-lucide-check',
  [TEXT_STATES.TO_CHECK]: 'i-lucide-eye',
  [TEXT_STATES.NEEDS_FIX]: 'i-lucide-triangle-alert',
  [TEXT_STATES.MISSING]: 'i-lucide-circle-dashed',
} as const

export const TEXT_STATE_LABELS = {
  [TEXT_STATES.REVIEWED]: 'Reviewed',
  [TEXT_STATES.TO_CHECK]: 'To check',
  [TEXT_STATES.NEEDS_FIX]: 'Needs a fix',
  [TEXT_STATES.MISSING]: 'Missing',
} as const
