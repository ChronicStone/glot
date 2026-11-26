import { procedures } from '../../../config/procedures.config.ts'
import { env } from '../../../env.ts'

export const healthRouter = procedures.health.handler(() => ({
  ok: true as const,
  version: env.GLOT_VERSION,
}))
