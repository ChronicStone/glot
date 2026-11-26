import { checkText } from '@glot/checks'
import type { Text, TextRefInput, TextSearchInput } from '@glot/contract'
import type { Draft, User } from '@glot/database'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { hashText } from '@glot/utils/hash'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import type { CatalogEntry, CatalogTranslation } from '../../catalogs/types/catalog.types.ts'
import { approvalKey } from '../../catalogs/utils/approval-key.utils.ts'
import { avoidWords } from '../../catalogs/utils/catalog.utils.ts'
import { draftView } from '../../drafts/utils/draft-view.utils.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import { pairKey } from '../utils/texts.utils.ts'

export class TextsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async search(input: TextSearchInput) {
    const texts = await this.all(input.projectId)
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
    const text = (await this.all(input.projectId)).find((t) => t.id === input.textId)

    if (!text) {
      throw new ORPCError('NOT_FOUND')
    }

    return text
  }

  failures(options: { repository: string; language: string; source: string; target: string }) {
    return checkText({
      source: options.source,
      target: options.target,
      avoid: avoidWords({
        glossary: this.#context.catalog.glossary(options.repository),
        language: options.language,
      }),
    })
  }

  async all(projectId: string): Promise<Text[]> {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)
    const userId = actorUserId(this.#context.actor)

    const [catalog, pending, appSources, drafts] = await Promise.all([
      this.#context.catalog.read(project),
      this.#context.db.approvals.findMany({ where: { projectId } }),
      this.#context.db.projectAppSources.findMany({
        where: { app: { is: { projectId } } },
        include: { app: true, source: true },
      }),
      this.#context.db.drafts.findMany({
        where: {
          projectId,
          OR: [
            { status: { in: [DRAFT_STATUSES.IN_REVIEW, DRAFT_STATUSES.APPROVED] } },
            { status: DRAFT_STATUSES.DRAFT, authorId: userId },
          ],
        },
        include: { author: true },
        orderBy: { updatedAt: 'asc' },
      }),
    ])

    const approvedBy = new Map(catalog.released)
    const selfApproved = new Set(catalog.releasedSelfApproved)

    for (const approval of pending) {
      const key = approvalKey(approval)

      approvedBy.set(key, approval.reviewerId)

      if (approval.selfApproved) {
        selfApproved.add(key)
      }
    }

    const draftsByPair = new Map<string, Array<Draft & { author: User }>>()

    for (const draft of drafts) {
      const key = pairKey(draft)

      draftsByPair.set(key, [...(draftsByPair.get(key) ?? []), draft])
    }

    const shownIn = new Map<string, string[]>()

    for (const { app, source } of appSources.toSorted((a, b) =>
      a.app.name.localeCompare(b.app.name),
    )) {
      shownIn.set(source.name, [...(shownIn.get(source.name) ?? []), app.name])
    }

    const glossary = this.#context.catalog.glossary(project.repository)

    return catalog.entries.map((entry) => ({
      id: entry.id,
      key: entry.key,
      source: { language: entry.sourceLanguage, value: entry.sourceValue },
      where: entry.key.source,
      shownIn: shownIn.get(entry.key.source) ?? [],
      translations: entry.translations.map((translation) =>
        this.#translation({
          entry,
          translation,
          approvedBy,
          selfApproved,
          drafts: draftsByPair.get(pairKey({ textId: entry.id, language: translation.language })),
          avoid: avoidWords({ glossary, language: translation.language }),
        }),
      ),
    }))
  }

  #translation(options: {
    entry: CatalogEntry
    translation: CatalogTranslation
    approvedBy: Map<string, string>
    selfApproved: Set<string>
    drafts: Array<Draft & { author: User }> | undefined
    avoid: string[]
  }) {
    const { entry, avoid } = options
    const drafts = options.drafts ?? []

    const approvedDraft = drafts.findLast((draft) => draft.status === DRAFT_STATUSES.APPROVED)

    const translation = approvedDraft
      ? this.#approved({ entry, draft: approvedDraft, avoid })
      : options.translation

    const key =
      translation.hash === null
        ? null
        : approvalKey({
            textId: entry.id,
            language: translation.language,
            sourceHash: entry.sourceHash,
            targetHash: translation.hash,
          })

    const reviewedBy =
      key === null || translation.failures.length > 0 ? null : (options.approvedBy.get(key) ?? null)

    const shown =
      drafts.findLast(
        (draft) =>
          draft.status !== DRAFT_STATUSES.APPROVED &&
          draft.authorId === actorUserId(this.#context.actor),
      ) ?? drafts.findLast((draft) => draft.status === DRAFT_STATUSES.IN_REVIEW)

    return {
      language: translation.language,
      value: translation.value,
      state: this.#state({ translation, reviewedBy }),
      failures: translation.failures,
      reviewedBy,
      selfApproved: reviewedBy !== null && key !== null && options.selfApproved.has(key),
      aiWritten: false,
      draft: shown
        ? draftView({
            draft: shown,
            authorName: shown.author.name,
            failures: checkText({ source: entry.sourceValue, target: shown.value, avoid }),
          })
        : null,
    }
  }

  #approved(options: { entry: CatalogEntry; draft: Draft; avoid: string[] }): CatalogTranslation {
    const { draft } = options

    return {
      language: draft.language,
      value: draft.value,
      hash: hashText(draft.value),
      failures: checkText({
        source: options.entry.sourceValue,
        target: draft.value,
        avoid: options.avoid,
      }),
    }
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
