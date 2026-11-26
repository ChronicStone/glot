import { apiKeyClient } from '@better-auth/api-key/client'
import { magicLinkClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import type { CreateAuthClientOptions } from './types/client.types.ts'

export function createGlotAuthClient(options: CreateAuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL,
    plugins: [organizationClient(), magicLinkClient(), apiKeyClient()],
  })
}

export type { GlotAuthClient } from './types/client.types.ts'
