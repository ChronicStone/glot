import type { MonthlyReportInput } from '@glot/contract'
import type { RequestContext } from '../../../types/context.types.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { WRITTEN_DRAFT_STATUSES } from '../constants/contributions.constants.ts'
import { monthRange } from '../utils/contribution-month.utils.ts'
import { volumesOf } from '../utils/contribution-volume.utils.ts'

export class ContributionsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async monthly(input: MonthlyReportInput) {
    await new WorkspaceAccessService(this.#context).requireManager({
      workspaceId: input.workspaceId,
    })

    const { people, totals } = await this.activity({
      workspaceId: input.workspaceId,
      ...monthRange(input.month),
    })

    const users = await this.#context.db.user.findMany({
      where: { id: { in: people.map(({ userId }) => userId) } },
    })

    const byId = new Map(users.map((user) => [user.id, user]))

    return {
      month: input.month,
      totals,
      people: people
        .flatMap(({ userId, ...volumes }) => {
          const user = byId.get(userId)

          return user
            ? [{ user: { id: user.id, name: user.name, email: user.email }, ...volumes }]
            : []
        })
        .toSorted(
          (a, b) =>
            b.written.words + b.reviewed.words - (a.written.words + a.reviewed.words) ||
            a.user.name.localeCompare(b.user.name),
        ),
    }
  }

  async activity(options: { workspaceId: string; from: Date; to: Date }) {
    const projects = await this.#context.db.projects.findMany({
      where: { workspaceId: options.workspaceId },
    })

    const projectId = { in: projects.map(({ id }) => id) }
    const during = { gte: options.from, lt: options.to }

    const [drafts, approvals] = await Promise.all([
      this.#context.db.drafts.findMany({
        where: {
          projectId,
          createdAt: during,
          status: { in: Object.values(WRITTEN_DRAFT_STATUSES) },
        },
      }),
      this.#context.db.approvals.findMany({
        where: { projectId, createdAt: during, selfApproved: false },
      }),
    ])

    return volumesOf({ drafts, approvals })
  }
}
