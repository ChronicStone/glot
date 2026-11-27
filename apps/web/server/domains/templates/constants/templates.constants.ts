import { TEXT_STATES } from '@glot/database/constants/texts'

export const PREVIEW_ADAPTER = {
  TIMEOUT_MS: 8000,
  TEMPLATES_PATH: '/templates',
  RENDER_PATH: '/render',
  SEND_TEST_PATH: '/send-test',
  MAX_RESPONSE_BYTES: 5_000_000,
} as const

export const TEXT_STATE_SEVERITY = {
  [TEXT_STATES.REVIEWED]: 0,
  [TEXT_STATES.TO_CHECK]: 1,
  [TEXT_STATES.NEEDS_FIX]: 2,
  [TEXT_STATES.MISSING]: 3,
} as const
