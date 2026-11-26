import type { ApproveInput } from '@glot/contract'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { hashText } from '../../../utils/hash.utils.ts'
import { TextsService } from '../../texts/services/texts.service.ts'

export class ReviewsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async approve(input: ApproveInput) {
    const texts = new TextsService(this.#context)
    const text = await texts.get(input)
    const translation = text.translations.find((t) => t.language === input.language)

    if (!translation?.value) {
      throw new ORPCError('NOT_FOUND')
    }

    const pair = {
      projectId: input.projectId,
      textId: input.textId,
      language: input.language,
      sourceHash: hashText(text.source.value),
      targetHash: hashText(translation.value),
    }

    const reviewerId = actorUserId(this.#context.actor)

    await this.#context.db.approvals.upsert({
      where: pair,
      create: { ...pair, reviewerId },
      update: { reviewerId },
    })

    return texts.get(input)
  }
}
