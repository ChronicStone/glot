import { resolveAuthenticatedActor } from '@glot/auth'
import { auth } from '../../config/auth.config.ts'
import { rpcHandler } from '../../config/orpc.config.ts'
import { toRequestContext } from '../../utils/request-context.utils.ts'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const actor = await resolveAuthenticatedActor(auth, request.headers)

  if (!actor) {
    return Response.json({ error: 'Sign in or send a token' }, { status: 401 })
  }

  const { response } = await rpcHandler.handle(request, {
    prefix: '/rpc',
    context: toRequestContext(actor),
  })

  return response ?? new Response('Not found', { status: 404 })
})
