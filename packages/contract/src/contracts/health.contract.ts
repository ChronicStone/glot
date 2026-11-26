import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { healthSchema } from '../validators/health.validator.ts'

export const healthContract = oc
  .meta(
    openapi({ method: 'GET', path: '/health', operationId: 'health', summary: 'Is the server up' }),
  )
  .output(healthSchema)
