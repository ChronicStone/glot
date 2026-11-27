import type { HomeInput } from '@glot/contract'
import { REVIEW_REASONS } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { RELEASE_STATUSES } from '@glot/database/constants/releases'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { targetLanguages } from '../../catalogs/utils/catalog.utils.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { ReleasesService } from '../../releases/services/releases.service.ts'
import { nextRunAt } from '../../releases/utils/release-schedule.utils.ts'
import { releaseView } from '../../releases/utils/release-view.utils.ts'
import { ContributionsService } from '../../contributions/services/contributions.service.ts'
import { ReviewsService } from '../../reviews/services/reviews.service.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { HOME_LIMITS, WEEK_MILLISECONDS } from '../constants/home.constants.ts'
import { fixesOf } from '../utils/home-fixes.utils.ts'
import { progressOf } from '../utils/home-progress.utils.ts'

export class HomeService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async overview(input: HomeInput) {
    await new WorkspaceAccessService(this.#context).membershipOf(input.workspaceId)

    const now = new Date()

    const projects = await this.#context.db.projects.findMany({
      where: { workspaceId: input.workspaceId },
      orderBy: { name: 'asc' },
    })

    const perProject = []

    for (const project of projects) {
      perProject.push(await this.#project({ id: project.id, name: project.name }))
    }

    const fixes = perProject
      .flatMap((entry) => entry.fixes)
      .toSorted((a, b) => b.shownIn.length - a.shownIn.length)

    const drafts = perProject.flatMap((entry) => entry.drafts)
    const reviews = perProject.flatMap((entry) => entry.reviews).filter(({ total }) => total > 0)

    const conflicts = perProject.flatMap((entry) =>
      entry.conflicts.total > 0 ? [entry.conflicts] : [],
    )

    const inProgress = drafts.filter(({ status }) => status === DRAFT_STATUSES.DRAFT)

    const projectIds = projects.map(({ id }) => id)
    const weekAgo = new Date(now.getTime() - WEEK_MILLISECONDS)

    const [shipped, shippedThisWeek, activity] = await Promise.all([
      this.#context.db.releases.findMany({
        where: { projectId: { in: projectIds }, status: RELEASE_STATUSES.MERGED },
        include: { startedBy: true },
        orderBy: { mergedAt: 'desc' },
        take: HOME_LIMITS.RELEASES,
      }),
      this.#context.db.releases.count({
        where: {
          projectId: { in: projectIds },
          status: RELEASE_STATUSES.MERGED,
          mergedAt: { gte: weekAgo },
        },
      }),
      new ContributionsService(this.#context).activity({
        workspaceId: input.workspaceId,
        from: weekAgo,
        to: now,
      }),
    ])

    const names = new Map(projects.map(({ id, name }) => [id, name]))

    return {
      needsYou: {
        total:
          fixes.length +
          reviews.reduce((sum, { total }) => sum + total, 0) +
          inProgress.length +
          conflicts.reduce((sum, { total }) => sum + total, 0),
        fixes: { total: fixes.length, items: fixes.slice(0, HOME_LIMITS.FIXES) },
        reviews,
        drafts: {
          inProgress: inProgress.length,
          sent: drafts.length - inProgress.length,
          latest: drafts
            .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, HOME_LIMITS.DRAFTS),
        },
        conflicts,
      },
      progress: perProject.map(({ progress }) => progress),
      shipped: shipped.map((release) => ({
        projectId: release.projectId,
        projectName: names.get(release.projectId) ?? '',
        ...releaseView({ release, startedByName: release.startedBy?.name ?? null }),
      })),
      week: {
        reviewed: activity.totals.reviewed.texts,
        written: activity.totals.written.texts,
        shipped: shippedThisWeek,
      },
      languages: {
        write: [...new Set(perProject.flatMap((entry) => entry.write))].toSorted(),
        approve: [...new Set(perProject.flatMap((entry) => entry.approve))].toSorted(),
      },
      nextReleaseAt: nextRunAt(now),
    }
  }

  async #project(options: { id: string; name: string }) {
    const { id: projectId, name: projectName } = options
    const rights = await new RightsService(this.#context).access(projectId)
    const texts = await new TextsService(this.#context).all(projectId)
    const reviews = new ReviewsService(this.#context)
    const userId = actorUserId(this.#context.actor)

    const [queues, conflicts, drafts] = await Promise.all([
      Promise.all(
        rights.approve.map(async (language) => {
          const items = await reviews.items({ project: rights.project, language, texts })

          return {
            projectId,
            projectName,
            language,
            total: items.length,
            sentForReview: items.filter(({ reason }) => reason === REVIEW_REASONS.SENT_FOR_REVIEW)
              .length,
          }
        }),
      ),
      new ReleasesService(this.#context).conflicts({ projectId, limit: 1 }),
      this.#context.db.drafts.findMany({
        where: {
          projectId,
          authorId: userId,
          status: { in: [DRAFT_STATUSES.DRAFT, DRAFT_STATUSES.IN_REVIEW] },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    const keys = new Map(texts.map(({ id, key }) => [id, key]))

    return {
      write: rights.write,
      approve: rights.approve,
      fixes: fixesOf({
        texts,
        languages: rights.write,
        project: { id: projectId, name: projectName },
      }),
      reviews: queues,
      conflicts: { projectId, projectName, total: conflicts.total },
      drafts: drafts.flatMap((draft) => {
        const key = keys.get(draft.textId)

        return key
          ? [
              {
                projectId,
                projectName,
                draftId: draft.id,
                textId: draft.textId,
                key,
                language: draft.language,
                status: draft.status,
                updatedAt: draft.updatedAt,
              },
            ]
          : []
      }),
      progress: {
        projectId,
        projectName,
        ...progressOf({ texts, languages: targetLanguages(rights.project) }),
      },
    }
  }
}
