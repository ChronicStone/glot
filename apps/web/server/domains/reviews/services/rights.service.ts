import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import { approvableLanguages, writableLanguages } from '../utils/rights.utils.ts'

export class RightsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async access(projectId: string) {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)

    const member = await this.#context.db.workspaceMemberships.findFirst({
      where: { workspaceId: project.workspaceId, userId: actorUserId(this.#context.actor) },
    })

    if (!member || (member.expiresAt && member.expiresAt <= new Date())) {
      throw new ORPCError('NOT_FOUND')
    }

    const rights = {
      role: member.role,
      languages: member.languages,
      targets: project.languages.filter((language) => language !== project.sourceLanguage),
    }

    return {
      project,
      write: writableLanguages(rights),
      approve: approvableLanguages(rights),
    }
  }

  async requireWrite(options: { projectId: string; language: string }) {
    const access = await this.access(options.projectId)

    if (!access.write.includes(options.language)) {
      throw new ORPCError('FORBIDDEN')
    }

    return access
  }

  async requireApprove(options: { projectId: string; language: string }) {
    const access = await this.access(options.projectId)

    if (!access.approve.includes(options.language)) {
      throw new ORPCError('FORBIDDEN')
    }

    return access
  }

  async reviewerCount(options: { workspaceId: string; language: string }) {
    const members = await this.#context.db.workspaceMemberships.findMany({
      where: { workspaceId: options.workspaceId, role: WORKSPACE_ROLES.REVIEWER },
    })

    return members.filter(
      (member) =>
        member.languages?.includes(options.language) &&
        (!member.expiresAt || member.expiresAt > new Date()),
    ).length
  }
}
