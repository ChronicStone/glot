import { PEOPLE_ONLY_ERRORS, PEOPLE_ONLY_PROCEDURES } from '@glot/contract'
import { COMMON_ERROR_STATUS_MAP } from '@orpc/client'
import { McpRegistrar } from '@orpc/mcp'
import { OpenAPIGenerator } from '@orpc/openapi'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferenceHandlerPlugin } from '@orpc/openapi/plugins'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod'
import { env } from '../env.ts'
import { router } from '../router.ts'

const converters = [new ZodToJsonSchemaConverter()]
const peopleOnlyPaths: string[] = Object.values(PEOPLE_ONLY_PROCEDURES)

const errorStatusMap = {
  ...COMMON_ERROR_STATUS_MAP,
  PEOPLE_ONLY: PEOPLE_ONLY_ERRORS.PEOPLE_ONLY.status,
}

export const openapiGenerator = new OpenAPIGenerator({ converters })

export const rpcHandler = new RPCHandler(router, { errorStatusMap })

export const restHandler = new OpenAPIHandler(router, { errorStatusMap })

export const referenceHandler = new OpenAPIHandler(
  {},
  {
    plugins: [
      new OpenAPIReferenceHandlerPlugin({
        spec: () =>
          openapiGenerator.generate(router, {
            base: {
              info: { title: 'Glot API', version: env.GLOT_VERSION },
              servers: [{ url: '/api/v1' }],
            },
          }),
        docsPath: '/docs',
        specPath: '/openapi.json',
      }),
    ],
  },
)

export const mcpRegistrar = new McpRegistrar(router, {
  converters,
  filter: (_procedure, path) => !peopleOnlyPaths.includes(path.join('.')),
})
