import type { Text, TextRefInput, TextSearchInput } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import type { CatalogTranslation } from '../../catalogs/types/catalog.types.ts'
import { approvalKey } from '../../catalogs/utils/approval-key.utils.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'

export class TextsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async search(input: TextSearchInput) {
    const texts = await this.#texts(input.projectId)
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

    const next = offset + input.limit

    return {
      items: found.slice(offset, next),
      total: found.length,
      nextCursor: next < found.length ? String(next) : null,
    }
  }

  async get(input: TextRefInput) {
    const text = (await this.#texts(input.projectId)).find((t) => t.id === input.textId)

    if (!text) {
      throw new ORPCError('NOT_FOUND')
    }

    return text
  }

  async #texts(projectId: string): Promise<Text[]> {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)

    const [catalog, pending, appSources] = await Promise.all([
      this.#context.catalog.read(project),
      this.#context.db.approvals.findMany({ where: { projectId } }),
      this.#context.db.projectAppSources.findMany({
        where: { app: { is: { projectId } } },
        include: { app: true, source: true },
      }),
    ])

    const approvedBy = new Map(catalog.released)

    for (const approval of pending) {
      approvedBy.set(approvalKey(approval), approval.reviewerId)
    }

    const shownIn = new Map<string, string[]>()

    for (const { app, source } of appSources.toSorted((a, b) =>
      a.app.name.localeCompare(b.app.name),
    )) {
      shownIn.set(source.name, [...(shownIn.get(source.name) ?? []), app.name])
    }

    return catalog.entries.map((entry) => ({
      id: entry.id,
      key: entry.key,
      source: { language: entry.sourceLanguage, value: entry.sourceValue },
      where: entry.key.source,
      shownIn: shownIn.get(entry.key.source) ?? [],
      translations: entry.translations.map((translation) => {
        const reviewedBy = this.#reviewer({
          translation,
          approvedBy,
          textId: entry.id,
          sourceHash: entry.sourceHash,
        })

        return {
          language: translation.language,
          value: translation.value,
          state: this.#state({ translation, reviewedBy }),
          failures: translation.failures,
          reviewedBy,
          aiWritten: false,
        }
      }),
    }))
  }

  #reviewer(options: {
    translation: CatalogTranslation
    approvedBy: Map<string, string>
    textId: string
    sourceHash: string
  }) {
    const { translation } = options

    if (translation.hash === null || translation.failures.length > 0) {
      return null
    }

    return (
      options.approvedBy.get(
        approvalKey({
          textId: options.textId,
          language: translation.language,
          sourceHash: options.sourceHash,
          targetHash: translation.hash,
        }),
      ) ?? null
    )
  }

  #state(options: { translation: CatalogTranslation; reviewedBy: string | null }) {
    if (options.translation.value === null) {
      return TEXT_STATES.MISSING
    }

    if (options.translation.failures.length > 0) {
      return TEXT_STATES.NEEDS_FIX
    }

    return options.reviewedBy ? TEXT_STATES.REVIEWED : TEXT_STATES.TO_CHECK
  }
}
