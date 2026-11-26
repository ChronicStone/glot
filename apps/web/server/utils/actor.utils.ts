import { ACTOR_KINDS } from '@glot/auth'
import type { AuthenticatedActor } from '@glot/auth'

export function actorUserId(actor: AuthenticatedActor) {
  return actor.kind === ACTOR_KINDS.PERSON ? actor.user.id : actor.userId
}
