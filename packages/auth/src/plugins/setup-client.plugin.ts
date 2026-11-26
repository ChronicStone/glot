import type { BetterAuthClientPlugin } from 'better-auth'
import type { setupPlugin } from './setup.plugin.ts'

export function setupClient() {
  return {
    id: 'setup',
    $InferServerPlugin: {} as ReturnType<typeof setupPlugin>,
  } satisfies BetterAuthClientPlugin
}
