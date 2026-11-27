import type { ProjectCreateInput, ProjectSyncInput, ProjectUpdateInput } from '@glot/contract'
import { activeMembershipWhere } from '@glot/database/utils/membership'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { sourcesWithinLanguages } from '../utils/project-languages.utils.ts'

export class ProjectsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  list() {
    return this.#context.db.projects.findMany({
      where: {
        workspace: {
          is: {
            memberships: {
              some: activeMembershipWhere({ userId: actorUserId(this.#context.actor) }),
            },
          },
        },
      },
      include: { apps: true, sources: true },
      orderBy: { name: 'asc' },
    })
  }

  async findAccessible(projectId: string) {
    if (this.#context.widget && this.#context.widget.projectId !== projectId) {
      throw new ORPCError('NOT_FOUND')
    }

    const project = await this.#context.db.projects.findFirst({
      where: {
        id: projectId,
        workspace: {
          is: {
            memberships: {
              some: activeMembershipWhere({ userId: actorUserId(this.#context.actor) }),
            },
          },
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
      where: { repository: { equals: input.repository, mode: 'insensitive' } },
    })

    if (taken) {
      throw new ORPCError('CONFLICT')
    }

    const { sources: requested, ...fields } = input
    const sources = sourcesWithinLanguages({ languages: input.languages, sources: requested })

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

    const { projectId, sources: requested, ...fields } = input
    const sources = sourcesWithinLanguages({ languages: input.languages, sources: requested })
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
