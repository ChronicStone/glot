import { TEMPLATE_KINDS } from '@glot/contract'
import type { TemplateSummary } from '@glot/contract'

export const TEMPLATE_ICONS = {
  email: 'i-lucide-mail',
  document: 'i-lucide-file-text',
  sms: 'i-lucide-smartphone',
} as const

export const TEMPLATE_KIND_LABELS = {
  [TEMPLATE_KINDS.EMAIL]: ['email', 'emails'],
  [TEMPLATE_KINDS.DOCUMENT]: ['document', 'documents'],
  [TEMPLATE_KINDS.SMS]: ['SMS', 'SMS'],
} as const satisfies Record<TemplateSummary['kind'], readonly [string, string]>

export const PREVIEW_DEVICES = {
  DESKTOP: 'desktop',
  PHONE: 'phone',
} as const

export const PREVIEW_WIDTHS = {
  [PREVIEW_DEVICES.DESKTOP]: 640,
  [PREVIEW_DEVICES.PHONE]: 375,
} as const

export const PREVIEW_TYPING_DELAY_MS = 250

export const CURLY_APOSTROPHE = '’'

export const STRAIGHT_APOSTROPHE = "'"

export const TEMPLATE_ERROR_CODES = {
  NO_ADAPTER: 'CONFLICT',
  ADAPTER_DOWN: 'BAD_GATEWAY',
} as const

export const PREVIEW_FRAME_STYLE = `
[data-glot-text] { cursor: pointer; border-radius: 4px; transition: box-shadow 120ms, background-color 120ms; }
[data-glot-text]:hover { box-shadow: 0 0 0 1.5px #a9c1ef; }
[data-glot-text].glot-missing { outline: 1.5px dashed #e58c37; outline-offset: 2px; }
[data-glot-text].glot-on { box-shadow: 0 0 0 2px #3864c8; background-color: rgb(56 100 200 / 8%); }
`
