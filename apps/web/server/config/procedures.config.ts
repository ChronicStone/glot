import { contract, PEOPLE_ONLY_PROCEDURES } from '@glot/contract'
import { ACTOR_KINDS } from '@glot/auth'
import { implement, ORPCError } from '@orpc/server'
import type { RequestContext } from '../types/context.types.ts'

const peopleOnlyPaths: string[] = Object.values(PEOPLE_ONLY_PROCEDURES)

export const procedures = implement(contract)
  .$context<RequestContext>()
  .use(({ context, path, next }) => {
    if (peopleOnlyPaths.includes(path.join('.')) && context.actor.kind !== ACTOR_KINDS.PERSON) {
      throw new ORPCError('PEOPLE_ONLY')
    }

    return next()
  })
