import type { TextSearchInput } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { Approval } from '@glot/database/types/approvals'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { hashText } from '../../../utils/hash.utils.ts'
import type { CatalogText } from '../../catalogs/types/catalog.types.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'

export class TextsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async search(input: TextSearchInput) {
    const texts = await this.#reviewedTexts(input.projectId)
    const words = input.q?.toLocaleLowerCase()
    const offset = input.cursor ? Number(input.cursor) : 0

    const found = texts
      .filter(
        (text) =>
          !words ||
          [text.source.value, ...text.translations.map((t) => t.value ?? '')].some((value) =>
            value.toLocaleLowerCase().includes(words),
          ),
      )
      .filter(
        (text) =>
          !input.state ||
          text.translations.some(
            (t) => t.state === input.state && (!input.language || t.language === input.language),
          ),
      )
      .toSorted((a, b) => b.readers - a.readers)

    const next = offset + input.limit

    return {
      items: found.slice(offset, next),
      total: found.length,
      nextCursor: next < found.length ? String(next) : null,
    }
  }

  async get(input: { projectId: string; textId: string }) {
    const text = (await this.#reviewedTexts(input.projectId)).find((t) => t.id === input.textId)

    if (!text) {
      throw new ORPCError('NOT_FOUND')
    }

    return text
  }

  async #reviewedTexts(projectId: string): Promise<CatalogText[]> {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)
    const approvals = await this.#context.db.approvals.findMany({ where: { projectId } })

    return this.#context.catalog
      .texts(project.repository)
      .map((text) => this.#withApprovals(text, approvals))
  }

  #withApprovals(text: CatalogText, approvals: Approval[]): CatalogText {
    const sourceHash = hashText(text.source.value)

    return {
      ...text,
      translations: text.translations.map((translation) => {
        const approval = approvals.find(
          (a) =>
            a.textId === text.id &&
            a.language === translation.language &&
            a.sourceHash === sourceHash &&
            a.targetHash === hashText(translation.value ?? ''),
        )

        return approval
          ? { ...translation, state: TEXT_STATES.REVIEWED, reviewedBy: approval.reviewerId }
          : translation
      }),
    }
  }
}
