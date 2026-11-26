import { resolveAuthenticatedActor } from '@glot/auth'
import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server'
import { auth } from '../config/auth.config.ts'
import { mcpRegistrar } from '../config/orpc.config.ts'
import { env } from '../env.ts'
import { toRequestContext } from '../utils/request-context.utils.ts'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const actor = await resolveAuthenticatedActor(auth, request.headers)

  if (!actor) {
    return Response.json({ error: 'Send a token' }, { status: 401 })
  }

  const server = new McpServer({ name: 'glot', version: env.GLOT_VERSION })

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await mcpRegistrar.register(server, { context: toRequestContext(actor) })
  await server.connect(transport)

  return transport.handleRequest(request)
})
