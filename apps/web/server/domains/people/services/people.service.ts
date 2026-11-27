import type {
  MembershipRefInput,
  PersonInviteInput,
  PersonUpdateInput,
  WorkspaceRefInput,
} from '@glot/contract'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { INVITATION_CALLBACK_PATH } from '../constants/people.constants.ts'
import { toPerson } from '../utils/people.utils.ts'
import { WorkspaceAccessService } from './workspace-access.service.ts'

export class PeopleService {
  readonly #context: RequestContext
  readonly #access: WorkspaceAccessService

  constructor(context: RequestContext) {
    this.#context = context
    this.#access = new WorkspaceAccessService(context)
  }

  async #managedMembership(input: { membershipId: string; grantedRole?: WorkspaceRole }) {
    const membership = await this.#context.db.workspaceMemberships.findFirst({
      where: { id: input.membershipId },
      include: { user: true },
    })

    if (!membership) {
      throw new ORPCError('NOT_FOUND')
    }

    const manager = await this.#access.requireManager({
      workspaceId: membership.workspaceId,
      roles: input.grantedRole ? [membership.role, input.grantedRole] : [membership.role],
    })

    if (manager.id === membership.id) {
      throw new ORPCError('FORBIDDEN')
    }

    return membership
  }

  async list(input: WorkspaceRefInput) {
    await this.#access.membershipOf(input.workspaceId)

    const memberships = await this.#context.db.workspaceMemberships.findMany({
      where: { workspaceId: input.workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })

    return memberships.map(toPerson)
  }

  async me(input: WorkspaceRefInput) {
    const { role, languages, expiresAt } = await this.#access.membershipOf(input.workspaceId)

    return { role, languages, expiresAt }
  }

  async invite(input: PersonInviteInput) {
    await this.#access.requireManager({ workspaceId: input.workspaceId, roles: [input.role] })

    const email = input.email.toLowerCase()
    const existing = await this.#context.db.user.findFirst({ where: { email } })

    if (existing) {
      const member = await this.#context.db.workspaceMemberships.exists({
        where: { workspaceId: input.workspaceId, userId: existing.id },
      })

      if (member) {
        throw new ORPCError('CONFLICT')
      }
    }

    const userId = existing?.id ?? (await this.#newUserId())

    const { user, membership } = await this.#context.db.transaction(async (tx) => {
      const person =
        existing ??
        (await tx.user.create({
          data: {
            id: userId,
            email,
            name: input.name ?? email.split('@')[0] ?? email,
            emailVerified: false,
          },
        }))

      const created = await tx.workspaceMemberships.create({
        data: {
          workspaceId: input.workspaceId,
          userId: person.id,
          role: input.role,
          languages: input.languages,
          expiresAt: input.expiresAt ?? null,
        },
      })

      return { user: person, membership: created }
    })

    try {
      await this.#context.auth.api.signInMagicLink({
        body: { email: user.email, callbackURL: INVITATION_CALLBACK_PATH },
        headers: new Headers(),
      })
    } catch {
      await this.#context.db.workspaceMemberships.delete({ where: { id: membership.id } })

      if (!existing) {
        await this.#context.db.user.delete({ where: { id: user.id } })
      }

      throw new ORPCError('BAD_GATEWAY', { message: 'The sign-in link could not be sent' })
    }

    return toPerson({ ...membership, user })
  }

  async #newUserId() {
    const { generateId } = await this.#context.auth.$context
    const id = generateId({ model: 'user' })

    if (id === false) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    return id
  }

  async update(input: PersonUpdateInput) {
    const { user } = await this.#managedMembership({
      membershipId: input.membershipId,
      grantedRole: input.role,
    })

    const changes = {
      role: input.role,
      languages: input.languages,
      expiresAt: input.expiresAt,
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
