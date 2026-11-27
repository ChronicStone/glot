import { countWords } from '@glot/checks'
import type {
  ApproveInput,
  ApproveSameInput,
  CommentInput,
  EditAndApproveInput,
  QueueInput,
  RequestChangeInput,
  ReviewTargetInput,
  Text,
} from '@glot/contract'
import type { Draft } from '@glot/database'
import { COMMENT_KINDS } from '@glot/database/constants/comments'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { REVIEW_REASONS } from '@glot/contract'
import { hashText } from '@glot/utils/hash'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { draftView } from '../../drafts/utils/draft-view.utils.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { commentView } from '../utils/comment-view.utils.ts'
import { approvedPairs, isApprovedElsewhere, queueItems } from '../utils/queue.utils.ts'
import { RightsService } from './rights.service.ts'

export class ReviewsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async rights(projectId: string) {
    const { write, approve } = await new RightsService(this.#context).access(projectId)

    return { write, approve }
  }

  async items(options: {
    project: { id: string; workspaceId: string }
    language: string
    texts: Text[]
  }) {
    const { project, language } = options

    const [drafts, changeRequests, approvals, reviewers] = await Promise.all([
      this.#context.db.drafts.findMany({
        where: { projectId: project.id, language, status: DRAFT_STATUSES.IN_REVIEW },
        include: { author: true },
        orderBy: { updatedAt: 'asc' },
      }),
      this.#context.db.comments.findMany({
        where: { projectId: project.id, language, kind: COMMENT_KINDS.CHANGE_REQUEST },
      }),
      this.#context.db.approvals.findMany({ where: { projectId: project.id, language } }),
      new RightsService(this.#context).reviewerCount({
        workspaceId: project.workspaceId,
        language,
      }),
    ])

    return queueItems({
      texts: options.texts,
      language,
      drafts,
      changeRequests,
      approvals,
      hideAuthorId: reviewers >= 2 ? actorUserId(this.#context.actor) : null,
    })
  }

  async queue(input: QueueInput) {
    const { project } = await new RightsService(this.#context).requireApprove(input)
    const texts = new TextsService(this.#context)

    const [all, words] = await Promise.all([
      texts.all(input.projectId),
      texts.words(project.workspaceId),
    ])

    const items = await this.items({ project, language: input.language, texts: all })

    const pairs = approvedPairs({ texts: all, language: input.language })
    const offset = input.cursor ? Number(input.cursor) : 0
    const next = offset + input.limit

    return {
      items: items.slice(offset, next).map(({ reason, text, draft }) => ({
        reason,
        language: input.language,
        text,
        draft: draft
          ? draftView({
              draft,
              authorName: draft.author.name,
              failures: texts.failures({
                words,
                language: input.language,
                source: text.source.value,
                target: draft.value,
              }),
            })
          : null,
      })),
      total: items.length,
      nextCursor: next < items.length ? String(next) : null,
      sameElsewhere: items.filter(
        ({ reason, text }) =>
          reason !== REVIEW_REASONS.SENT_FOR_REVIEW &&
          isApprovedElsewhere({ text, language: input.language, pairs }),
      ).length,
    }
  }

  async approve(input: ApproveInput) {
    const rights = new RightsService(this.#context)
    const { project } = await rights.requireApprove(input)
    const texts = new TextsService(this.#context)
    const { text, current } = await this.#target({ texts, input })

    const draft = input.draftId ? await this.#inReview({ input, draftId: input.draftId }) : null

    const value = draft?.value ?? current

    if (value === null) {
      throw new ORPCError('CONFLICT', { message: 'There is no text to approve' })
    }

    const selfApproved = await this.#guard({
      project,
      text,
      language: input.language,
      value,
      authorId: draft?.authorId ?? null,
    })

    await this.#record({
      input,
      text,
      value,
      selfApproved,
      change: draft ? { draft } : null,
    })

    return texts.get(input)
  }

  async editAndApprove(input: EditAndApproveInput) {
    const { project } = await new RightsService(this.#context).requireApprove(input)
    const texts = new TextsService(this.#context)
    const { text, current } = await this.#target({ texts, input })
    const edited = input.value !== current

    const selfApproved = await this.#guard({
      project,
      text,
      language: input.language,
      value: input.value,
      authorId: edited ? actorUserId(this.#context.actor) : null,
    })

    await this.#record({
      input,
      text,
      value: input.value,
      selfApproved,
      change: edited
        ? {
            value: input.value,
            base: await this.#context.catalog.base({
              project,
              textId: input.textId,
              language: input.language,
            }),
          }
        : null,
    })

    return texts.get(input)
  }

  async approveSame(input: ApproveSameInput) {
    const { project } = await new RightsService(this.#context).requireApprove(input)
    const texts = await new TextsService(this.#context).all(input.projectId)
    const userId = actorUserId(this.#context.actor)
    const pairs = approvedPairs({ texts, language: input.language })

    const matching = texts.flatMap((text) => {
      const translation = text.translations.find(({ language }) => language === input.language)

      return translation?.state === 'TO_CHECK' &&
        isApprovedElsewhere({ text, language: input.language, pairs })
        ? [
            {
              projectId: project.id,
              textId: text.id,
              language: input.language,
              sourceHash: hashText(text.source.value),
              targetHash: hashText(translation.value ?? ''),
              words: countWords(translation.value ?? ''),
              reviewerId: userId,
            },
          ]
        : []
    })

    await this.#context.db.approvals.createMany({ data: matching, skipDuplicates: true })

    return { approved: matching.length }
  }

  async requestChange(input: RequestChangeInput) {
    await new RightsService(this.#context).requireApprove(input)

    const texts = new TextsService(this.#context)
    const { current } = await this.#target({ texts, input })

    const draft = input.draftId ? await this.#inReview({ input, draftId: input.draftId }) : null

    if (!draft && current === null) {
      throw new ORPCError('CONFLICT', { message: 'There is no text to ask a change on' })
    }

    const authorId = actorUserId(this.#context.actor)

    const comment = await this.#context.db.transaction(async (tx) => {
      if (draft) {
        await tx.drafts.update({ where: { id: draft.id }, data: { status: DRAFT_STATUSES.DRAFT } })
      }

      return tx.comments.create({
        data: {
          projectId: input.projectId,
          textId: input.textId,
          language: input.language,
          authorId,
          kind: COMMENT_KINDS.CHANGE_REQUEST,
          body: input.body,
          targetHash: current === null ? null : hashText(current),
        },
      })
    })

    return commentView({ comment, authorName: await this.#authorName(authorId) })
  }

  async comment(input: CommentInput) {
    await new RightsService(this.#context).access(input.projectId)

    const texts = new TextsService(this.#context)

    await this.#target({ texts, input })

    const authorId = actorUserId(this.#context.actor)

    const comment = await this.#context.db.comments.create({
      data: {
        projectId: input.projectId,
        textId: input.textId,
        language: input.language,
        authorId,
        body: input.body,
      },
    })

    return commentView({ comment, authorName: await this.#authorName(authorId) })
  }

  async comments(input: ReviewTargetInput) {
    await new RightsService(this.#context).access(input.projectId)

    const comments = await this.#context.db.comments.findMany({
      where: { projectId: input.projectId, textId: input.textId, language: input.language },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    })

    return comments.map((comment) => commentView({ comment, authorName: comment.author.name }))
  }

  async #target(options: { texts: TextsService; input: ReviewTargetInput }) {
    const text = await options.texts.get(options.input)

    const translation = text.translations.find(
      ({ language }) => language === options.input.language,
    )

    if (!translation) {
      throw new ORPCError('NOT_FOUND')
    }

    return { text, current: translation.value }
  }

  async #inReview(options: { input: ReviewTargetInput; draftId: string }) {
    const draft = await this.#context.db.drafts.findFirst({
      where: {
        id: options.draftId,
        projectId: options.input.projectId,
        textId: options.input.textId,
        language: options.input.language,
        status: DRAFT_STATUSES.IN_REVIEW,
      },
    })

    if (!draft) {
      throw new ORPCError('NOT_FOUND')
    }

    return draft
  }

  async #guard(options: {
    project: { workspaceId: string }
    text: Text
    language: string
    value: string
    authorId: string | null
  }) {
    const texts = new TextsService(this.#context)

    const failures = texts.failures({
      words: await texts.words(options.project.workspaceId),
      language: options.language,
      source: options.text.source.value,
      target: options.value,
    })

    if (failures.length > 0) {
      throw new ORPCError('CONFLICT', { message: 'This text fails a check' })
    }

    if (options.authorId !== actorUserId(this.#context.actor)) {
      return false
    }

    const reviewers = await new RightsService(this.#context).reviewerCount({
      workspaceId: options.project.workspaceId,
      language: options.language,
    })

    if (reviewers >= 2) {
      throw new ORPCError('FORBIDDEN', {
        message: 'Another reviewer of this language must approve your change',
      })
    }

    return true
  }

  async #record(options: {
    input: ReviewTargetInput
    text: Text
    value: string
    selfApproved: boolean
    change:
      | { draft: Draft }
      | { value: string; base: { baseSourceHash: string | null; baseTargetHash: string | null } }
      | null
  }) {
    const { input, change } = options
    const reviewerId = actorUserId(this.#context.actor)

    const pair = {
      projectId: input.projectId,
      textId: input.textId,
      language: input.language,
      sourceHash: hashText(options.text.source.value),
      targetHash: hashText(options.value),
    }

    const words = countWords(options.value)

    await this.#context.db.transaction(async (tx) => {
      await tx.approvals.upsert({
        where: pair,
        create: { ...pair, reviewerId, selfApproved: options.selfApproved, words },
        update: { reviewerId, selfApproved: options.selfApproved, words },
      })

      if (!change) {
        return
      }

      await tx.drafts.updateMany({
        where: {
          projectId: input.projectId,
          textId: input.textId,
          language: input.language,
          status: DRAFT_STATUSES.APPROVED,
        },
        data: { status: DRAFT_STATUSES.WITHDRAWN },
      })

      if ('draft' in change) {
        await tx.drafts.update({
          where: { id: change.draft.id },
          data: { status: DRAFT_STATUSES.APPROVED },
        })

        return
      }

      const mine = await tx.drafts.findFirst({
        where: {
          projectId: input.projectId,
          textId: input.textId,
          language: input.language,
          authorId: reviewerId,
          status: { in: [DRAFT_STATUSES.DRAFT, DRAFT_STATUSES.IN_REVIEW] },
        },
      })

      if (mine) {
        await tx.drafts.update({
          where: { id: mine.id },
          data: { value: change.value, status: DRAFT_STATUSES.APPROVED, ...change.base },
        })

        return
      }

      await tx.drafts.create({
        data: {
          projectId: input.projectId,
          textId: input.textId,
          language: input.language,
          value: change.value,
          authorId: reviewerId,
          status: DRAFT_STATUSES.APPROVED,
          ...change.base,
        },
      })
    })
  }

  async #authorName(userId: string) {
    const author = await this.#context.db.user.findFirst({ where: { id: userId } })

    return author?.name ?? ''
  }
}
