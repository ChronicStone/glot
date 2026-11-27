import { createHmac, timingSafeEqual } from 'node:crypto'
import { WIDGET_TOKEN } from '../constants/widget.constants.ts'
import type { WidgetClaims } from '../types/widget.types.ts'
import { widgetClaimsSchema } from '../validators/widget.validator.ts'

function signature(options: { body: string; secret: string }) {
  const key = createHmac('sha256', options.secret).update(WIDGET_TOKEN.KEY_CONTEXT).digest()

  return createHmac('sha256', key).update(options.body).digest()
}

export function signWidgetToken(options: { claims: WidgetClaims; secret: string }) {
  const body = Buffer.from(JSON.stringify(options.claims)).toString('base64url')
  const signed = signature({ body, secret: options.secret }).toString('base64url')

  return `${WIDGET_TOKEN.PREFIX}${body}.${signed}`
}

export function readWidgetToken(options: { token: string; secret: string; now: Date }) {
  if (!options.token.startsWith(WIDGET_TOKEN.PREFIX)) {
    return null
  }

  const [body = '', sent = ''] = options.token.slice(WIDGET_TOKEN.PREFIX.length).split('.')
  const expected = signature({ body, secret: options.secret })
  const received = Buffer.from(sent, 'base64url')

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null
  }

  const claims = widgetClaimsSchema.safeParse(
    JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
  )

  return claims.success && claims.data.expiresAt * 1000 > options.now.getTime() ? claims.data : null
}
