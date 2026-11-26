import { contract } from '@glot/contract'
import { implement } from '@orpc/server'
import type { RequestContext } from '../types/context.types.ts'

export const procedures = implement(contract).$context<RequestContext>()
