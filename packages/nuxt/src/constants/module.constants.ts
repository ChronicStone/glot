export const CONFIG_KEY = 'glot'

export const WIDGET_TAG = 'glot-widget'

export const WIDGET_TEMPLATES = {
  CSS: 'glot/widget-css.mjs',
  ICONS: 'glot/widget-icons.mjs',
} as const

export const CSS_PROPERTY_RULE = /@property[^{]+\{[^}]*\}/gu

export const SHADOW_REWRITES = {
  ROOT: [/:root\b/gu, ':host'],
  DARK_HTML: [/html\.dark\b/gu, ':host(.dark)'],
  DARK_CLASS: [/(^|[\s,{}])\.dark\s/gmu, '$1:host(.dark) '],
} as const

export const WIDGET_ICONS = {
  CLOSE: 'x',
  NEEDS_FIX: 'triangle-alert',
  TO_CHECK: 'eye',
  NOT_CLICKABLE: 'eye-off',
  REVIEWED: 'check',
  MISSING: 'circle-dashed',
  PERSON: 'user',
  OPEN: 'arrow-up-right',
  GLOSSARY: 'book-open-text',
} as const
