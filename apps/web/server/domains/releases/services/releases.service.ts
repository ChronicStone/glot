import { CONFLICT_RESOLUTIONS } from '@glot/contract'
import type {
  ReleaseChangesInput,
  ReleasePageInput,
  ReleaseProjectInput,
  ResolveConflictInput,
  UndoInput,
} from '@glot/contract'
import type { Draft } from '@glot/database'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { RELEASE_STATUSES, RELEASE_TRIGGERS } from '@glot/database/constants/releases'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import type { CatalogEntry } from '../../catalogs/types/catalog.types.ts'
import { draftView } from '../../drafts/utils/draft-view.utils.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import type { GlossaryWords } from '../../glossary/types/glossary.types.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { RELEASE_ROLES } from '../constants/releases.constants.ts'
import { approvedKeys, draftConflict } from '../utils/release-conflict.utils.ts'
import { nextRunAt } from '../utils/release-schedule.utils.ts'
import { releaseChangeView, releaseView } from '../utils/release-view.utils.ts'
import { ReleaseRunnerService } from './release-runner.service.ts'

export class ReleasesService {
  readonly #context: RequestContext
  readonly #runner: ReleaseRunnerService

  constructor(context: RequestContext) {
    this.#context = context
    this.#runner = new ReleaseRunnerService(context)
  }

  async next(input: ReleaseProjectInput) {
    const project = await new ProjectsService(this.#context).findAccessible(input.projectId)
    const { plan } = await this.#runner.sync({ project, fresh: false })

    const open = await this.#context.db.releases.findFirst({
      where: { projectId: project.id, status: RELEASE_STATUSES.OPEN },
      include: { startedBy: true },
    })

    return {
      open: open
        ? releaseView({ release: open, startedByName: open.startedBy?.name ?? null })
        : null,
      ready: { changes: plan.changes.length, approvals: plan.lines.length },
      conflicts: plan.conflicts.length,
      nextRunAt: nextRunAt(new Date()),
    }
  }

  async history(input: ReleasePageInput) {
    const project = await new ProjectsService(this.#context).findAccessible(input.projectId)

    await this.#runner.sync({ project, fresh: false })

    const where = { projectId: project.id, status: RELEASE_STATUSES.MERGED }
    const offset = input.cursor ? Number(input.cursor) : 0
    const next = offset + input.limit

    const [total, releases] = await Promise.all([
      this.#context.db.releases.count({ where }),
      this.#context.db.releases.findMany({
        where,
        include: { startedBy: true },
        orderBy: { mergedAt: 'desc' },
        take: input.limit,
        skip: offset,
      }),
    ])

    return {
      items: releases.map((release) =>
        releaseView({ release, startedByName: release.startedBy?.name ?? null }),
      ),
      total,
      nextCursor: next < total ? String(next) : null,
    }
  }

  async changes(input: ReleaseChangesInput) {
    const project = await new ProjectsService(this.#context).findAccessible(input.projectId)

    const release = await this.#context.db.releases.exists({
      where: { id: input.releaseId, projectId: project.id },
    })

    if (!release) {
      throw new ORPCError('NOT_FOUND')
    }

    const where = { releaseId: input.releaseId }
    const offset = input.cursor ? Number(input.cursor) : 0
    const next = offset + input.limit

    const [total, changes] = await Promise.all([
      this.#context.db.releaseChanges.count({ where }),
      this.#context.db.releaseChanges.findMany({
        where,
        include: { author: true },
        orderBy: { id: 'asc' },
        take: input.limit,
        skip: offset,
      }),
    ])

    return {
      items: changes.map((change) =>
        releaseChangeView({ change, authorName: change.author?.name ?? null }),
      ),
      total,
      nextCursor: next < total ? String(next) : null,
    }
  }

  async conflicts(input: ReleasePageInput) {
    const { project, approve } = await new RightsService(this.#context).access(input.projectId)
    const { catalog, plan } = await this.#runner.sync({ project, fresh: false })
    const userId = actorUserId(this.#context.actor)

    const mine = plan.conflicts.filter(
      ({ draft }) => draft.authorId === userId || approve.includes(draft.language),
    )

    const offset = input.cursor ? Number(input.cursor) : 0
    const next = offset + input.limit
    const page = mine.slice(offset, next)
    const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]))

    const authors = await this.#context.db.user.findMany({
      where: { id: { in: page.map(({ draft }) => draft.authorId) } },
    })

    const names = new Map(authors.map(({ id, name }) => [id, name]))
    const words = await new TextsService(this.#context).words(project.workspaceId)

    return {
      items: page.map(({ draft, reason }) => {
        const entry = entries.get(draft.textId)

        return {
          reason,
          draft: this.#view({
            words,
            draft,
            authorName: names.get(draft.authorId) ?? '',
            entry,
          }),
          source: entry?.sourceValue ?? null,
          current:
            entry?.translations.find(({ language }) => language === draft.language)?.value ?? null,
        }
      }),
      total: mine.length,
      nextCursor: next < mine.length ? String(next) : null,
    }
  }

  async run(input: ReleaseProjectInput) {
    const project = await this.#requireReleaser(input.projectId)

    const release = await this.#runner.run({
      project,
      trigger: RELEASE_TRIGGERS.MANUAL,
      startedById: actorUserId(this.#context.actor),
    })

    if (!release) {
      throw new ORPCError('CONFLICT', { message: 'There is nothing to release' })
    }

    return releaseView({ release, startedByName: await this.#name(release.startedById) })
  }

  async undo(input: UndoInput) {
    const project = await this.#requireReleaser(input.projectId)

    const change = await this.#context.db.releaseChanges.findFirst({
      where: {
        id: input.changeId,
        releaseId: input.releaseId,
        release: { is: { projectId: project.id } },
      },
      include: { release: true, author: true },
    })

    if (!change) {
      throw new ORPCError('NOT_FOUND')
    }

    if (change.release.status !== RELEASE_STATUSES.MERGED) {
      throw new ORPCError('CONFLICT', { message: 'Only a merged release can be undone' })
    }

    if (change.undoDraftId !== null) {
      throw new ORPCError('CONFLICT', { message: 'This text was already restored' })
    }

    if (change.previousValue === null) {
      throw new ORPCError('CONFLICT', { message: 'This text had no text before this release' })
    }

    const { catalog } = await this.#runner.sync({ project, fresh: true })
    const entry = catalog.entries.find(({ id }) => id === change.textId)
    const current = entry?.translations.find(({ language }) => language === change.language)

    if (!entry || !current || current.value !== change.value) {
      throw new ORPCError('CONFLICT', { message: 'This text changed since this release' })
    }

    const previousValue = change.previousValue

    const restored = await this.#context.db.transaction(async (tx) => {
      const waiting = await tx.drafts.exists({
        where: {
          projectId: project.id,
          textId: change.textId,
          language: change.language,
          status: { in: [DRAFT_STATUSES.APPROVED, DRAFT_STATUSES.CONFLICT] },
        },
      })

      if (waiting) {
        return null
      }

      const draft = await tx.drafts.create({
        data: {
          projectId: project.id,
          textId: change.textId,
          language: change.language,
          value: previousValue,
          authorId: actorUserId(this.#context.actor),
          status: DRAFT_STATUSES.APPROVED,
          baseSourceHash: entry.sourceHash,
          baseTargetHash: current.hash,
        },
      })

      return tx.releaseChanges
        .update({ where: { id: change.id }, data: { undoDraftId: draft.id } })
        .throw()
    })

    if (!restored) {
      throw new ORPCError('CONFLICT', {
        message: 'Another change to this text is waiting to be released',
      })
    }

    return releaseChangeView({ change: restored, authorName: change.author?.name ?? null })
  }

  async resolveConflict(input: ResolveConflictInput) {
    const { project, approve } = await new RightsService(this.#context).access(input.projectId)
    const { catalog, approvals } = await this.#runner.sync({ project, fresh: false })

    const draft = await this.#context.db.drafts.findFirst({
      where: { id: input.draftId, projectId: project.id },
      include: { author: true },
    })

    if (!draft) {
      throw new ORPCError('NOT_FOUND')
    }

    if (draft.authorId !== actorUserId(this.#context.actor) && !approve.includes(draft.language)) {
      throw new ORPCError('FORBIDDEN')
    }

    if (draft.status !== DRAFT_STATUSES.CONFLICT) {
      throw new ORPCError('CONFLICT', { message: 'This change is not held back by a conflict' })
    }

    const entry = catalog.entries.find(({ id }) => id === draft.textId)
    const current = entry?.translations.find(({ language }) => language === draft.language)

    if (input.resolution === CONFLICT_RESOLUTIONS.LEAVE_OUT) {
      const withdrawn = await this.#context.db.drafts
        .update({ where: { id: draft.id }, data: { status: DRAFT_STATUSES.WITHDRAWN } })
        .throw()

      return this.#view({
        words: await new TextsService(this.#context).words(project.workspaceId),
        draft: withdrawn,
        authorName: draft.author.name,
        entry,
      })
    }

    if (!entry || !current) {
      throw new ORPCError('CONFLICT', { message: 'This text no longer exists' })
    }

    const needsReview =
      draftConflict({ draft, entry, approved: approvedKeys({ catalog, approvals }) }) ===
      'SOURCE_CHANGED'

    if (needsReview) {
      const active = await this.#context.db.drafts.exists({
        where: {
          projectId: project.id,
          textId: draft.textId,
          language: draft.language,
          authorId: draft.authorId,
          status: { in: [DRAFT_STATUSES.DRAFT, DRAFT_STATUSES.IN_REVIEW] },
        },
      })

      if (active) {
        throw new ORPCError('CONFLICT', { message: 'There is a newer draft of this text' })
      }
    }

    const kept = await this.#context.db.transaction(async (tx) => {
      if (!needsReview) {
        await tx.drafts.updateMany({
          where: {
            projectId: project.id,
            textId: draft.textId,
            language: draft.language,
            status: DRAFT_STATUSES.APPROVED,
            id: { not: draft.id },
          },
          data: { status: DRAFT_STATUSES.WITHDRAWN },
        })
      }

      return tx.drafts
        .update({
          where: { id: draft.id },
          data: {
            status: needsReview ? DRAFT_STATUSES.IN_REVIEW : DRAFT_STATUSES.APPROVED,
            baseSourceHash: entry.sourceHash,
            baseTargetHash: current.hash,
          },
        })
        .throw()
    })

    return this.#view({
      words: await new TextsService(this.#context).words(project.workspaceId),
      draft: kept,
      authorName: draft.author.name,
      entry,
    })
  }

  #view(options: {
    words: GlossaryWords
    draft: Draft
    authorName: string
    entry: CatalogEntry | undefined
  }) {
    const { draft, entry } = options

    return draftView({
      draft,
      authorName: options.authorName,
      failures: entry
        ? new TextsService(this.#context).failures({
            words: options.words,
            language: draft.language,
            source: entry.sourceValue,
            target: draft.value,
            syntax: entry.syntax,
          })
        : [],
    })
  }

  async #requireReleaser(projectId: string) {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)

    const membership = await new WorkspaceAccessService(this.#context).membershipOf(
      project.workspaceId,
    )

    if (!Object.values<string>(RELEASE_ROLES).includes(membership.role)) {
      throw new ORPCError('FORBIDDEN')
    }

    return project
  }

  async #name(userId: string | null) {
    if (userId === null) {
      return null
    }

    const user = await this.#context.db.user.findFirst({ where: { id: userId } })

    return user?.name ?? null
  }
}
