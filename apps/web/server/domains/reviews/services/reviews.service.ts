import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { hashText } from '../../../utils/hash.utils.ts'
import { TextsService } from '../../texts/services/texts.service.ts'

export class ReviewsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async approve(input: { projectId: string; textId: string; language: string }) {
    const { actor } = this.#context

    if (actor.kind !== 'person') {
      throw new ORPCError('PEOPLE_ONLY')
    }

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

    if (!(await this.#context.db.approvals.exists({ where: pair }))) {
      await this.#context.db.approvals.create({ data: { ...pair, reviewerId: actor.user.id } })
    }

    return texts.get(input)
  }
}
