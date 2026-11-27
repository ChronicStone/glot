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

export const HOST_EVENTS = {
  POINTER_DOWN: 'pointerdown',
  POINTER_UP: 'pointerup',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  TOUCH_START: 'touchstart',
  CLICK: 'click',
  FOCUS_IN: 'focusin',
  FOCUS_OUT: 'focusout',
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  KEY_PRESS: 'keypress',
} as const

export const CARET_STOP = '\u200B'

export const NARROW_SCREEN = '(max-width: 760px)'

export const PLURAL = {
  SEPARATOR: ' | ',
  SPLIT: /\s*\|\s*/u,
  SAMPLE_UP_TO: 100,
  RANGES_SHOWN: 2,
} as const

export const VUE_I18N_FORM_LABELS = {
  TWO: ['1', 'other'],
  THREE: ['0', '1', '2+'],
} as const

export const DRAG = {
  THRESHOLD: 4,
  IGNORE: 'button, a, select, input, [contenteditable]',
} as const

export const DOCK_SIDES = {
  LEFT: 'left',
  RIGHT: 'right',
} as const

export const LAYOUT_STORAGE = {
  LAUNCHER: 'glot:launcher:',
  DOCK: 'glot:dock:',
} as const
