import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'

export class ProjectsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  list() {
    return this.#context.db.projects.findMany({
      where: {
        workspace: { is: { memberships: { some: { userId: actorUserId(this.#context.actor) } } } },
      },
      include: { apps: true },
      orderBy: { name: 'asc' },
    })
  }

  async findAccessible(projectId: string) {
    const project = await this.#context.db.projects.findFirst({
      where: {
        id: projectId,
        workspace: { is: { memberships: { some: { userId: actorUserId(this.#context.actor) } } } },
      },
    })

    if (!project) {
      throw new ORPCError('NOT_FOUND')
    }

    return project
  }
}
