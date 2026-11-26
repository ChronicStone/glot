import type { AuthenticatedActor } from '@glot/auth'

export function actorUserId(actor: AuthenticatedActor) {
  return actor.kind === 'person' ? actor.user.id : actor.userId
}
