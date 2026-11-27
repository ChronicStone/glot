import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import type { RequestContext } from '../../../types/context.types.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { missingTexts } from '../utils/ai-fill.utils.ts'

export class AiFillPlanService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async missing(options: { projectId: string; language: string }) {
    const { project } = await new RightsService(this.#context).requireWrite(options)

    const [texts, drafts] = await Promise.all([
      new TextsService(this.#context).all(options.projectId),
      this.#context.db.drafts.findMany({
        where: {
          projectId: options.projectId,
          language: options.language,
          status: {
            in: [
              DRAFT_STATUSES.DRAFT,
              DRAFT_STATUSES.IN_REVIEW,
              DRAFT_STATUSES.APPROVED,
              DRAFT_STATUSES.CONFLICT,
            ],
          },
        },
      }),
    ])

    return {
      project,
      texts: missingTexts({
        texts,
        language: options.language,
        skip: new Set(drafts.map(({ textId }) => textId)),
      }),
    }
  }
}
