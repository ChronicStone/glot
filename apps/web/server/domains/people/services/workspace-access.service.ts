import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { activeMembershipWhere } from '../../../utils/membership.utils.ts'
import { PEOPLE_MANAGER_ROLES } from '../constants/people.constants.ts'

export class WorkspaceAccessService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async membershipOf(workspaceId: string) {
    const membership = await this.#context.db.workspaceMemberships.findFirst({
      where: { workspaceId, ...activeMembershipWhere(actorUserId(this.#context.actor)) },
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    return membership
  }

  async requireManager(input: { workspaceId: string; grantedRole?: WorkspaceRole }) {
    const membership = await this.membershipOf(input.workspaceId)
    const grantsOwnership = input.grantedRole === WORKSPACE_ROLES.OWNER

    if (
      !Object.values<string>(PEOPLE_MANAGER_ROLES).includes(membership.role) ||
      (grantsOwnership && membership.role !== WORKSPACE_ROLES.OWNER)
    ) {
      throw new ORPCError('FORBIDDEN')
    }

    return membership
  }
}
