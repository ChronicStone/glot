import type { DraftSaveInput } from '@glot/contract'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { TextsService } from '../../texts/services/texts.service.ts'

export class DraftsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async save(input: DraftSaveInput) {
    await new TextsService(this.#context).get(input)

    return this.#context.db.drafts.create({
      data: {
        projectId: input.projectId,
        textId: input.textId,
        language: input.language,
        value: input.value,
        authorId: actorUserId(this.#context.actor),
      },
    })
  }
}
