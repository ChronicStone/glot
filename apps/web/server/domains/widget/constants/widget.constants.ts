export const WIDGET_TOKEN = {
  PREFIX: 'glotw.',
  LIFETIME_SECONDS: 3600,
  KEY_CONTEXT: 'glot-widget-token',
} as const

export const WIDGET_RPC_PREFIX = '/widget/rpc'

export const WIDGET_CORS_HEADERS = {
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-max-age': '600',
} as const
