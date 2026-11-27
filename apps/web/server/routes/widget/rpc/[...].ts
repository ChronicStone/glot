import { widgetRpcHandler } from '../../../config/orpc.config.ts'
import { database } from '../../../config/database.config.ts'
import {
  WIDGET_CORS_HEADERS,
  WIDGET_RPC_PREFIX,
} from '../../../domains/widget/constants/widget.constants.ts'
import { WidgetActorService } from '../../../domains/widget/services/widget-actor.service.ts'
import { env } from '../../../env.ts'
import { toRequestContext } from '../../../utils/request-context.utils.ts'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const origin = request.headers.get('origin') ?? ''

  if (!env.WIDGET_ORIGINS.includes(origin)) {
    return new Response('This origin cannot reach Glot', { status: 403 })
  }

  const cors = { 'access-control-allow-origin': origin, vary: 'origin' }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, ...WIDGET_CORS_HEADERS } })
  }

  const scope = await new WidgetActorService(database.db).resolve(request)

  if (!scope) {
    return Response.json({ error: 'Sign in to Glot again' }, { status: 401, headers: cors })
  }

  const { response } = await widgetRpcHandler.handle(request, {
    prefix: WIDGET_RPC_PREFIX,
    context: { ...toRequestContext(scope.actor), widget: scope.widget },
  })

  const answer = response ?? new Response('Not found', { status: 404 })

  for (const [name, value] of Object.entries(cors)) {
    answer.headers.set(name, value)
  }

  return answer
})
