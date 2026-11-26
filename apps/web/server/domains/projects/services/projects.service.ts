import type { ProjectSyncInput } from '@glot/contract'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { activeMembershipWhere } from '../../../utils/membership.utils.ts'

export class ProjectsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  list() {
    return this.#context.db.projects.findMany({
      where: {
        workspace: {
          is: { memberships: { some: activeMembershipWhere(actorUserId(this.#context.actor)) } },
        },
      },
      include: { apps: true, sources: true },
      orderBy: { name: 'asc' },
    })
  }

  async findAccessible(projectId: string) {
    const project = await this.#context.db.projects.findFirst({
      where: {
        id: projectId,
        workspace: {
          is: { memberships: { some: activeMembershipWhere(actorUserId(this.#context.actor)) } },
        },
      },
      include: { sources: true },
    })

    if (!project) {
      throw new ORPCError('NOT_FOUND')
    }

    return project
  }

  async sync(input: ProjectSyncInput) {
    const project = await this.findAccessible(input.projectId)
    const catalog = await this.#context.catalog.sync(project)

    return { commit: catalog.commit, texts: catalog.entries.length }
  }
}
