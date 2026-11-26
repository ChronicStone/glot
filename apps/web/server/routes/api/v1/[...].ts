import { resolveAuthenticatedActor } from '@glot/auth'
import { auth } from '../../../config/auth.config.ts'
import { referenceHandler, restHandler } from '../../../config/orpc.config.ts'
import { toRequestContext } from '../../../utils/request-context.utils.ts'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const reference = await referenceHandler.handle(request, { prefix: '/api/v1' })

  if (reference.response) {
    return reference.response
  }

  const actor = await resolveAuthenticatedActor(auth, request.headers)

  if (!actor) {
    return Response.json({ error: 'Sign in or send a token' }, { status: 401 })
  }

  const { response } = await restHandler.handle(request, {
    prefix: '/api/v1',
    context: toRequestContext(actor),
  })

  return response ?? new Response('Not found', { status: 404 })
})
