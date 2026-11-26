import type {
  MembershipRefInput,
  PersonInviteInput,
  PersonUpdateInput,
  WorkspaceRefInput,
} from '@glot/contract'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { activeMembershipWhere } from '../../../utils/membership.utils.ts'
import {
  INVITATION_CALLBACK_PATH,
  INVITATION_PROVISIONING_SOURCE,
  PEOPLE_MANAGER_ROLES,
} from '../constants/people.constants.ts'
import { toPerson } from '../utils/people.utils.ts'

export class PeopleService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async #membershipOf(workspaceId: string) {
    const membership = await this.#context.db.workspaceMemberships.findFirst({
      where: { workspaceId, ...activeMembershipWhere(actorUserId(this.#context.actor)) },
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    return membership
  }

  async #requireManager(input: { workspaceId: string; grantedRole?: WorkspaceRole }) {
    const membership = await this.#membershipOf(input.workspaceId)
    const grantsOwnership = input.grantedRole === WORKSPACE_ROLES.OWNER

    if (
      !Object.values<string>(PEOPLE_MANAGER_ROLES).includes(membership.role) ||
      (grantsOwnership && membership.role !== WORKSPACE_ROLES.OWNER)
    ) {
      throw new ORPCError('FORBIDDEN')
    }

    return membership
  }

  async #managedMembership(input: { membershipId: string; grantedRole?: WorkspaceRole }) {
    const membership = await this.#context.db.workspaceMemberships.findFirst({
      where: { id: input.membershipId },
      include: { user: true },
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    const manager = await this.#requireManager({
      workspaceId: membership.workspaceId,
      ...(input.grantedRole ? { grantedRole: input.grantedRole } : {}),
    })

    if (manager.id === membership.id) {
      throw new ORPCError('FORBIDDEN')
    }

    return membership
  }

  async #userFor(input: PersonInviteInput) {
    const email = input.email.toLowerCase()
    const existing = await this.#context.db.user.findFirst({ where: { email } })

    if (existing) {
      return existing
    }

    const { internalAdapter } = await this.#context.auth.$context

    await internalAdapter.createUser(
      { email, name: input.name ?? email.split('@')[0] ?? email, emailVerified: false },
      INVITATION_PROVISIONING_SOURCE,
    )

    const created = await this.#context.db.user.findFirst({ where: { email } })

    if (!created) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    return created
  }

  async list(input: WorkspaceRefInput) {
    await this.#membershipOf(input.workspaceId)

    const memberships = await this.#context.db.workspaceMemberships.findMany({
      where: { workspaceId: input.workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })

    return memberships.map(toPerson)
  }

  async me(input: WorkspaceRefInput) {
    const { role, languages, expiresAt } = await this.#membershipOf(input.workspaceId)

    return { role, languages, expiresAt }
  }

  async invite(input: PersonInviteInput) {
    await this.#requireManager({ workspaceId: input.workspaceId, grantedRole: input.role })

    const user = await this.#userFor(input)

    const member = await this.#context.db.workspaceMemberships.exists({
      where: { workspaceId: input.workspaceId, userId: user.id },
    })

    if (member) {
      throw new ORPCError('CONFLICT')
    }

    const membership = await this.#context.db.workspaceMemberships.create({
      data: {
        workspaceId: input.workspaceId,
        userId: user.id,
        role: input.role,
        languages: input.languages,
        expiresAt: input.expiresAt ?? null,
      },
    })

    await this.#context.auth.api.signInMagicLink({
      body: { email: user.email, callbackURL: INVITATION_CALLBACK_PATH },
      headers: new Headers(),
    })

    return toPerson({ ...membership, user })
  }

  async update(input: PersonUpdateInput) {
    const { user } = await this.#managedMembership({
      membershipId: input.membershipId,
      grantedRole: input.role,
    })

    const changes = {
      role: input.role,
      languages: input.languages,
      expiresAt: input.expiresAt ?? null,
    }

    const membership = await this.#context.db.workspaceMemberships.update({
      where: { id: input.membershipId },
      data: changes,
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    return toPerson({ ...membership, user })
  }

  async remove(input: MembershipRefInput) {
    await this.#managedMembership({ membershipId: input.membershipId })
    await this.#context.db.workspaceMemberships.delete({ where: { id: input.membershipId } })

    return { removed: true as const }
  }
}
