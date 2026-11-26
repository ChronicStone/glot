import type { ProjectCreateInput, ProjectSyncInput, ProjectUpdateInput } from '@glot/contract'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { activeMembershipWhere } from '../../../utils/membership.utils.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'

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

  async #withAppsAndSources(projectId: string) {
    const project = await this.#context.db.projects.findFirst({
      where: { id: projectId },
      include: { apps: true, sources: true },
    })

    if (!project) {
      throw new ORPCError('NOT_FOUND')
    }

    return project
  }

  async create(input: ProjectCreateInput) {
    await new WorkspaceAccessService(this.#context).requireManager({
      workspaceId: input.workspaceId,
    })

    const taken = await this.#context.db.projects.exists({
      where: { workspaceId: input.workspaceId, repository: input.repository },
    })

    if (taken) {
      throw new ORPCError('CONFLICT')
    }

    const { sources, ...fields } = input

    const project = await this.#context.db.transaction(async (tx) => {
      const created = await tx.projects.create({ data: fields })

      await tx.projectSources.createMany({
        data: sources.map((source) => ({ ...source, projectId: created.id })),
      })

      return created
    })

    return this.#withAppsAndSources(project.id)
  }

  async update(input: ProjectUpdateInput) {
    const project = await this.findAccessible(input.projectId)

    await new WorkspaceAccessService(this.#context).requireManager({
      workspaceId: project.workspaceId,
    })

    const { projectId, sources, ...fields } = input
    const kept = new Set(sources.map(({ name }) => name))

    await this.#context.db.transaction(async (tx) => {
      await tx.projects.update({ where: { id: projectId }, data: fields })

      await tx.projectSources.deleteMany({
        where: { projectId, name: { notIn: [...kept] } },
      })

      for (const source of sources) {
        await tx.projectSources.upsert({
          where: { projectId, name: source.name },
          create: { ...source, projectId },
          update: source,
        })
      }
    })

    return this.#withAppsAndSources(projectId)
  }
}
