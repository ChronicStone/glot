import { TEXT_STATES } from '@glot/database/constants/texts'

export const TEXT_STATE_TONES = {
  [TEXT_STATES.REVIEWED]: 'bg-ok-soft text-ok',
  [TEXT_STATES.TO_CHECK]: 'bg-accent-soft text-accent',
  [TEXT_STATES.NEEDS_FIX]: 'bg-bad-soft text-bad',
  [TEXT_STATES.MISSING]: 'text-ink-3 ring-1 ring-inset ring-ink-4',
} as const

export const TEXT_STATE_LABELS = {
  [TEXT_STATES.REVIEWED]: 'Reviewed',
  [TEXT_STATES.TO_CHECK]: 'To check',
  [TEXT_STATES.NEEDS_FIX]: 'Needs a fix',
  [TEXT_STATES.MISSING]: 'Missing',
} as const
