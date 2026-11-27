import type { WidgetTokenInput } from '@glot/contract'
import { ACTOR_KINDS } from '@glot/auth'
import { ORPCError } from '@orpc/server'
import { env } from '../../../env.ts'
import type { RequestContext } from '../../../types/context.types.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import { WIDGET_TOKEN } from '../constants/widget.constants.ts'
import { signWidgetToken } from '../utils/widget-token.utils.ts'

export class WidgetService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async token(input: WidgetTokenInput) {
    const { actor, widget } = this.#context

    if (actor.kind !== ACTOR_KINDS.PERSON || !actor.sessionId) {
      throw new ORPCError('FORBIDDEN')
    }

    if (!env.WIDGET_ORIGINS.includes(input.origin) || (widget && widget.origin !== input.origin)) {
      throw new ORPCError('FORBIDDEN')
    }

    const found = await this.#context.db.projects.findFirst({
      where: { repository: { equals: input.repository, mode: 'insensitive' } },
    })

    if (!found) {
      throw new ORPCError('NOT_FOUND')
    }

    const { project, write } = await new RightsService(this.#context).access(found.id)

    const membership = await new WorkspaceAccessService(this.#context).membershipOf(
      project.workspaceId,
    )

    if (membership.expiresAt && env.WIDGET_PRODUCTION_ORIGINS.includes(input.origin)) {
      throw new ORPCError('FORBIDDEN')
    }

    const expiresAt = new Date(Date.now() + WIDGET_TOKEN.LIFETIME_SECONDS * 1000)

    const token = signWidgetToken({
      claims: {
        sessionId: actor.sessionId,
        userId: actor.user.id,
        projectId: project.id,
        origin: input.origin,
        expiresAt: Math.floor(expiresAt.getTime() / 1000),
      },
      secret: env.AUTH_SECRET,
    })

    return {
      token,
      expiresAt,
      project,
      member: actor.user,
      languages: write,
    }
  }
}
