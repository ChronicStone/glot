import { TEXT_STATES } from '@glot/database/constants/texts'

export const TEXT_STATE_TONES = {
  [TEXT_STATES.REVIEWED]: 'bg-ok-bg text-ok',
  [TEXT_STATES.TO_CHECK]: 'bg-check-bg text-check',
  [TEXT_STATES.NEEDS_FIX]: 'bg-fix-bg text-fix',
  [TEXT_STATES.MISSING]: 'text-ink-4 ring-1 ring-inset ring-line-2',
} as const

export const TEXT_STATE_LABELS = {
  [TEXT_STATES.REVIEWED]: 'Reviewed',
  [TEXT_STATES.TO_CHECK]: 'To check',
  [TEXT_STATES.NEEDS_FIX]: 'Needs a fix',
  [TEXT_STATES.MISSING]: 'Missing',
} as const
