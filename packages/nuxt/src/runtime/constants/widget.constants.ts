export const WIDGET_STORAGE = {
  SESSION: 'glot:session:',
  SIGNED_BEFORE: 'glot:signed-before:',
} as const

export const WIDGET_URL_FLAG = 'glot'

export const WIDGET_POPUP = {
  NAME: 'glot-sign-in',
  FEATURES: 'popup,width=460,height=640',
  PATH: '/widget/sign-in',
} as const

export const WIDGET_RPC_PATH = '/widget/rpc'

export const WIDGET_TIMING = {
  REFRESH_BEFORE_MS: 300_000,
  FETCH_DELAY_MS: 400,
  KEYS_PER_CALL: 1000,
} as const

export const PAGE_OWNER = -1

export const TRANSLATED_ATTRIBUTES = {
  PLACEHOLDER: 'placeholder',
  TITLE: 'title',
  ARIA_LABEL: 'aria-label',
  ALT: 'alt',
  VALUE: 'value',
} as const

export const WIDGET_LAYOUT = {
  EDITOR_WIDTH: 380,
  EDITOR_GAP: 12,
  DRAWER_SPACE: 384,
  EDGE: 12,
} as const

export const STATE_BADGES = {
  TO_CHECK: '?',
  NEEDS_FIX: '!',
} as const
