import type { GlotClientOptions } from '../types/client.types.ts'

export function toTransportOptions(options: GlotClientOptions) {
  const customFetch = options.fetch

  return {
    origin: new URL(options.url).origin,
    headers: () => (options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(customFetch
      ? { fetch: (input: string, init: RequestInit) => customFetch(input, init) }
      : {}),
  }
}
