import { activeMembershipWhere } from '@glot/database/utils/membership'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { PEOPLE_MANAGER_ROLES, ROLE_RANKS } from '../constants/people.constants.ts'

export class WorkspaceAccessService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async membershipOf(workspaceId: string) {
    const membership = await this.#context.db.workspaceMemberships.findFirst({
      where: {
        workspaceId,
        ...activeMembershipWhere({ userId: actorUserId(this.#context.actor) }),
      },
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    return membership
  }

  async requireManager(input: { workspaceId: string; roles?: WorkspaceRole[] }) {
    const membership = await this.membershipOf(input.workspaceId)
    const rank = ROLE_RANKS[membership.role]
    const outranked = (input.roles ?? []).some((role) => ROLE_RANKS[role] > rank)

    if (!Object.values<string>(PEOPLE_MANAGER_ROLES).includes(membership.role) || outranked) {
      throw new ORPCError('FORBIDDEN')
    }

    return membership
  }
}
