import { AUTHORIZATION_HEADER, BEARER_PREFIX } from '@glot/contract'
import type { GlotClientOptions } from '../types/client.types.ts'

export function toTransportOptions(options: GlotClientOptions) {
  const customFetch = options.fetch

  return {
    origin: new URL(options.url).origin,
    headers: () =>
      options.token ? { [AUTHORIZATION_HEADER]: `${BEARER_PREFIX}${options.token}` } : {},
    ...(customFetch
      ? { fetch: (input: string, init: RequestInit) => customFetch(input, init) }
      : {}),
  }
}
