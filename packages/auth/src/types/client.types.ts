import type { createGlotAuthClient } from '../client.ts'

export interface CreateAuthClientOptions {
  baseURL: string
}

export type GlotAuthClient = ReturnType<typeof createGlotAuthClient>
