import { contract } from '@glot/contract'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { OpenAPILink } from '@orpc/openapi/fetch'
import { REST_PATH, RPC_PATH } from './constants/sdk.constants.ts'
import type { GlotClient, GlotClientOptions } from './types/client.types.ts'
import { toTransportOptions } from './utils/transport.utils.ts'

export function createGlotClient(options: GlotClientOptions): GlotClient {
  return createORPCClient(
    new RPCLink({ ...toTransportOptions(options), url: options.path ?? RPC_PATH }),
  )
}

export function createGlotRestClient(options: GlotClientOptions): GlotClient {
  return createORPCClient(
    new OpenAPILink(contract, { ...toTransportOptions(options), url: options.path ?? REST_PATH }),
  )
}
