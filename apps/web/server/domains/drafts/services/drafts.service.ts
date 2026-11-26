import type { DraftRefInput, DraftSaveInput } from '@glot/contract'
import type { Draft } from '@glot/database'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { draftView } from '../utils/draft-view.utils.ts'

export class DraftsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async save(input: DraftSaveInput) {
    const { project } = await new RightsService(this.#context).requireWrite(input)
    const texts = new TextsService(this.#context)
    const text = await texts.get(input)

    if (!text.translations.some(({ language }) => language === input.language)) {
      throw new ORPCError('NOT_FOUND')
    }

    const authorId = actorUserId(this.#context.actor)

    const base = await this.#context.catalog.base({
      project,
      textId: input.textId,
      language: input.language,
    })

    const active = await this.#context.db.drafts.findFirst({
      where: {
        projectId: input.projectId,
        textId: input.textId,
        language: input.language,
        authorId,
        status: { in: [DRAFT_STATUSES.DRAFT, DRAFT_STATUSES.IN_REVIEW] },
      },
    })

    const draft = active
      ? await this.#context.db.drafts
          .update({
            where: { id: active.id },
            data: { value: input.value, status: DRAFT_STATUSES.DRAFT, ...base },
          })
          .throw()
      : await this.#context.db.drafts.create({
          data: {
            projectId: input.projectId,
            textId: input.textId,
            language: input.language,
            value: input.value,
            authorId,
            ...base,
          },
        })

    return await this.#view({ draft, repository: project.repository, source: text.source.value })
  }

  async send(input: DraftRefInput) {
    const { draft, repository, source } = await this.#own(input)

    if (draft.status !== DRAFT_STATUSES.DRAFT) {
      throw new ORPCError('CONFLICT', { message: 'This draft is not waiting to be sent' })
    }

    const view = await this.#view({ draft, repository, source })

    if (view.failures.length > 0) {
      throw new ORPCError('CONFLICT', { message: 'This draft fails a check' })
    }

    const sent = await this.#context.db.drafts
      .update({
        where: { id: draft.id },
        data: { status: DRAFT_STATUSES.IN_REVIEW },
      })
      .throw()

    return this.#view({ draft: sent, repository, source })
  }

  async withdraw(input: DraftRefInput) {
    const { draft, repository, source } = await this.#own(input)

    if (draft.status !== DRAFT_STATUSES.DRAFT && draft.status !== DRAFT_STATUSES.IN_REVIEW) {
      throw new ORPCError('CONFLICT', { message: 'This draft can no longer be withdrawn' })
    }

    const withdrawn = await this.#context.db.drafts
      .update({
        where: { id: draft.id },
        data: { status: DRAFT_STATUSES.WITHDRAWN },
      })
      .throw()

    return this.#view({ draft: withdrawn, repository, source })
  }

  async #own(input: DraftRefInput) {
    const draft = await this.#context.db.drafts.findFirst({
      where: {
        id: input.draftId,
        projectId: input.projectId,
        authorId: actorUserId(this.#context.actor),
      },
    })

    if (!draft) {
      throw new ORPCError('NOT_FOUND')
    }

    const { project } = await new RightsService(this.#context).requireWrite({
      projectId: input.projectId,
      language: draft.language,
    })

    const text = await new TextsService(this.#context).get({
      projectId: input.projectId,
      textId: draft.textId,
    })

    return { draft, repository: project.repository, source: text.source.value }
  }

  async #view(options: { draft: Draft; repository: string; source: string }) {
    const author = await this.#context.db.user.findFirst({ where: { id: options.draft.authorId } })

    return draftView({
      draft: options.draft,
      authorName: author?.name ?? '',
      failures: new TextsService(this.#context).failures({
        repository: options.repository,
        language: options.draft.language,
        source: options.source,
        target: options.draft.value,
      }),
    })
  }
}
