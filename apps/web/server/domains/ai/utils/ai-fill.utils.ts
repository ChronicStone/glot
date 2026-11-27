import type { AiFillView, Text } from '@glot/contract'
import { AI_FILL_STATUSES } from '@glot/contract'
import type { AiFill, Job, User } from '@glot/database'
import { AI_FILL_STOP_REASONS } from '@glot/database/constants/ai'
import { JOB_STATUSES } from '@glot/database/constants/jobs'
import { ORPCError } from '@orpc/server'
import { stopDataSchema } from '../validators/ai-answer.validator.ts'
import { AI_FILL_REASON_MESSAGES } from '../constants/ai.constants.ts'

export function missingTexts(options: { texts: Text[]; language: string; skip: Set<string> }) {
  return options.texts
    .filter(
      (text) =>
        !options.skip.has(text.id) &&
        text.source.value.trim().length > 0 &&
        text.translations.some(
          (translation) => translation.language === options.language && translation.value === null,
        ),
    )
    .toSorted((a, b) => b.shownIn.length - a.shownIn.length)
}

export function chunks<Item>(options: { items: Item[]; size: number }) {
  return Array.from({ length: Math.ceil(options.items.length / options.size) }, (_unused, index) =>
    options.items.slice(index * options.size, (index + 1) * options.size),
  )
}

function statusOf(fill: AiFill & { job: Job }): AiFillView['status'] {
  if (fill.job.status === JOB_STATUSES.PENDING) {
    return AI_FILL_STATUSES.QUEUED
  }

  if (fill.job.status === JOB_STATUSES.RUNNING) {
    return AI_FILL_STATUSES.RUNNING
  }

  if (fill.job.status === JOB_STATUSES.FAILED) {
    return AI_FILL_STATUSES.FAILED
  }

  return fill.stopReason ? AI_FILL_STATUSES.PARTIAL : AI_FILL_STATUSES.DONE
}

export function fillView(fill: AiFill & { job: Job; requestedBy: User }): AiFillView {
  const failed = fill.job.status === JOB_STATUSES.FAILED

  return {
    id: fill.id,
    projectId: fill.projectId,
    language: fill.language,
    status: statusOf(fill),
    total: fill.total,
    filled: fill.filled,
    rejected: fill.rejected,
    reason: fill.stopReason
      ? {
          code: fill.stopReason,
          message: fill.stopMessage ?? AI_FILL_REASON_MESSAGES[fill.stopReason],
        }
      : failed
        ? {
            code: 'PROVIDER_ERROR',
            message: fill.job.error ?? AI_FILL_REASON_MESSAGES.PROVIDER_ERROR,
          }
        : null,
    requestedByName: fill.requestedBy.name,
    createdAt: fill.createdAt,
    finishedAt: fill.job.finishedAt,
  }
}

export function stopOf(error: unknown) {
  if (!(error instanceof ORPCError)) {
    return null
  }

  const reason = stopDataSchema.safeParse(error.data).data?.reason

  if (reason === AI_FILL_STOP_REASONS.BUDGET_REACHED || reason === AI_FILL_STOP_REASONS.NO_KEY) {
    return { code: reason, message: error.message }
  }

  return error.code === 'BAD_GATEWAY'
    ? { code: AI_FILL_STOP_REASONS.PROVIDER_ERROR, message: error.message }
    : null
}
