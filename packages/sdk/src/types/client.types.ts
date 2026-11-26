import type { Contract } from '@glot/contract'
import type { RouterContractClient } from '@orpc/contract'

export type GlotClient = RouterContractClient<Contract>

export interface GlotClientOptions {
  url: string
  token?: string
  path?: `/${string}`
  fetch?: typeof globalThis.fetch
}
