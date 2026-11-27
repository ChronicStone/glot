import { ACTOR_KINDS } from '@glot/auth'
import type { AiFill, Job } from '@glot/database'
import { AI_FILL_STOP_REASONS, AI_USAGE_KINDS } from '@glot/database/constants/ai'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { JOB_KINDS, JOB_STATUSES } from '@glot/database/constants/jobs'
import type { RequestContext } from '../../../types/context.types.ts'
import { GlossaryService } from '../../glossary/services/glossary.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { AI_FILL_JOB, AI_FILL_REASON_MESSAGES } from '../constants/ai.constants.ts'
import { chunks, stopOf } from '../utils/ai-fill.utils.ts'
import { AiFillPlanService } from './ai-fill-plan.service.ts'
import { AiTranslatorService } from './ai-translator.service.ts'

export class AiFillJobsService {
  readonly #context: Omit<RequestContext, 'actor'>

  constructor(options: { context: Omit<RequestContext, 'actor'> }) {
    this.#context = options.context
  }

  async tick(options: { now: Date }) {
    const { now } = options
    const { db } = this.#context

    await db.jobs.updateMany({
      where: {
        kind: JOB_KINDS.AI_FILL,
        status: JOB_STATUSES.RUNNING,
        startedAt: { lt: new Date(now.getTime() - AI_FILL_JOB.STUCK_MS) },
      },
      data: { status: JOB_STATUSES.FAILED, finishedAt: now, error: AI_FILL_JOB.STUCK_ERROR },
    })

    const due = await db.jobs.findMany({
      where: { kind: JOB_KINDS.AI_FILL, status: JOB_STATUSES.PENDING, runAt: { lte: now } },
      orderBy: { runAt: 'asc' },
    })

    for (const job of due) {
      await this.#perform({ job, now })
    }
  }

  async #perform(options: { job: Job; now: Date }) {
    const { job, now } = options
    const { db } = this.#context

    const claimed = await db.jobs.updateMany({
      where: { id: job.id, status: JOB_STATUSES.PENDING },
      data: { status: JOB_STATUSES.RUNNING, startedAt: now },
    })

    if (claimed.count === 0) {
      return
    }

    try {
      const fill = await db.aiFills.findFirst({ where: { jobId: job.id } }).throw()

      await this.#run(fill)

      await db.jobs.update({
        where: { id: job.id },
        data: { status: JOB_STATUSES.DONE, finishedAt: new Date() },
      })
    } catch (error) {
      await db.jobs.update({
        where: { id: job.id },
        data: {
          status: JOB_STATUSES.FAILED,
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  async #run(fill: AiFill) {
    const { db } = this.#context
    const requester = await db.user.findFirst({ where: { id: fill.requestedById } }).throw()

    const context: RequestContext = {
      ...this.#context,
      actor: {
        kind: ACTOR_KINDS.PERSON,
        sessionId: null,
        user: {
          id: requester.id,
          email: requester.email,
          name: requester.name,
          image: requester.image,
          locale: requester.locale,
        },
      },
    }

    const { project, texts } = await new AiFillPlanService(context).missing({
      projectId: fill.projectId,
      language: fill.language,
    })

    await db.aiFills.update({ where: { id: fill.id }, data: { total: texts.length } })

    const glossary = await new GlossaryService(context).list({
      projectId: fill.projectId,
      language: fill.language,
    })

    const textsService = new TextsService(context)

    const words = await textsService.words(project.workspaceId)
    const translator = new AiTranslatorService(context)

    const waves = chunks({
      items: chunks({ items: texts, size: this.#context.ai.batchSize }),
      size: this.#context.ai.concurrency,
    })

    let filled = 0
    let rejected = 0
    let stop: { code: keyof typeof AI_FILL_STOP_REASONS; message: string } | null = null

    for (const wave of waves) {
      const settled = await Promise.allSettled(
        wave.map(async (batch) => {
          const { results } = await translator.translate({
            project,
            language: fill.language,
            texts: batch,
            glossary,
            kind: AI_USAGE_KINDS.FILL,
          })

          const drafts = []

          for (const { text, value } of results) {
            const failures =
              value === null
                ? null
                : textsService.failures({
                    words,
                    language: fill.language,
                    source: text.source.value,
                    target: value,
                  })

            if (value !== null && failures?.length === 0) {
              drafts.push({
                projectId: project.id,
                textId: text.id,
                language: fill.language,
                value,
                authorId: fill.requestedById,
                status: DRAFT_STATUSES.IN_REVIEW,
                aiWritten: true,
                ...(await context.catalog.base({
                  project,
                  textId: text.id,
                  language: fill.language,
                })),
              })
            }
          }

          await db.drafts.createMany({ data: drafts, skipDuplicates: true })

          return { filled: drafts.length, rejected: results.length - drafts.length }
        }),
      )

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          filled += outcome.value.filled
          rejected += outcome.value.rejected
        } else {
          stop ??= stopOf(outcome.reason)

          if (!stop) {
            throw outcome.reason
          }
        }
      }

      await db.aiFills.update({ where: { id: fill.id }, data: { filled, rejected } })

      if (stop) {
        break
      }
    }

    const reason =
      stop ??
      (rejected > 0
        ? {
            code: AI_FILL_STOP_REASONS.TEXTS_REJECTED,
            message: AI_FILL_REASON_MESSAGES.TEXTS_REJECTED,
          }
        : null)

    await db.aiFills.update({
      where: { id: fill.id },
      data: {
        filled,
        rejected,
        stopReason: reason?.code ?? null,
        stopMessage: reason?.message ?? null,
      },
    })
  }
}
