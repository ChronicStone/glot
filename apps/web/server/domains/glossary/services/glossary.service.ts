import type {
  GlossaryConceptCreateInput,
  GlossaryConceptRefInput,
  GlossaryConceptsInput,
  GlossaryConceptUpdateInput,
  GlossaryListInput,
  GlossaryStatusInput,
  WorkspaceRefInput,
} from '@glot/contract'
import { GLOSSARY_ERRORS } from '@glot/contract'
import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'
import type { GlossaryTermStatus } from '@glot/database/types/glossary'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import {
  glossaryRightsOf,
  mayChangeLanguages,
  normalizeTerms,
  touchedLanguages,
} from '../utils/glossary-rights.utils.ts'
import { toGlossaryTerm } from '../utils/glossary-view.utils.ts'
import { wordsOf } from '../utils/glossary-words.utils.ts'

export class GlossaryService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async list(input: GlossaryListInput) {
    const project = await new ProjectsService(this.#context).findAccessible(input.projectId)

    const validated = await this.#concepts({
      workspaceId: project.workspaceId,
      status: GLOSSARY_TERM_STATUSES.VALIDATED,
    })

    return validated.filter(
      (concept) =>
        !input.language || concept.neverTranslate || Object.hasOwn(concept.terms, input.language),
    )
  }

  async listConcepts(input: GlossaryConceptsInput) {
    await new WorkspaceAccessService(this.#context).membershipOf(input.workspaceId)

    return this.#concepts(input)
  }

  async rights(input: WorkspaceRefInput) {
    const membership = await new WorkspaceAccessService(this.#context).membershipOf(
      input.workspaceId,
    )

    return glossaryRightsOf({ role: membership.role, languages: membership.languages })
  }

  async wordsToCheck(workspaceId: string) {
    const validated = await this.#concepts({
      workspaceId,
      status: GLOSSARY_TERM_STATUSES.VALIDATED,
    })

    return wordsOf(validated)
  }

  async createConcept(input: GlossaryConceptCreateInput) {
    const terms = normalizeTerms(input.terms)

    await this.#requireRights({
      workspaceId: input.workspaceId,
      touched: touchedLanguages({ before: null, after: { ...input, terms } }),
    })

    await this.#requireFreeName({ workspaceId: input.workspaceId, name: input.name })

    const created = await this.#context.db.transaction(async (tx) => {
      const concept = await tx.glossaryConcepts.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          definition: input.definition,
          neverTranslate: input.neverTranslate,
          notes: input.notes,
        },
      })

      await tx.glossaryConceptTerms.createMany({
        data: Object.entries(terms).map(([language, words]) => ({
          conceptId: concept.id,
          language,
          ...words,
        })),
      })

      return concept
    })

    return this.#concept(created.id)
  }

  async updateConcept(input: GlossaryConceptUpdateInput) {
    const concept = await this.#concept(input.conceptId)
    const terms = normalizeTerms(input.terms)

    await this.#requireRights({
      workspaceId: concept.workspaceId,
      touched: touchedLanguages({ before: concept, after: { ...input, terms } }),
    })

    if (input.name.toLocaleLowerCase() !== concept.name.toLocaleLowerCase()) {
      await this.#requireFreeName({ workspaceId: concept.workspaceId, name: input.name })
    }

    await this.#context.db.transaction(async (tx) => {
      await tx.glossaryConcepts.update({
        where: { id: concept.id },
        data: {
          name: input.name,
          definition: input.definition,
          neverTranslate: input.neverTranslate,
          notes: input.notes,
        },
      })

      await tx.glossaryConceptTerms.deleteMany({ where: { conceptId: concept.id } })

      await tx.glossaryConceptTerms.createMany({
        data: Object.entries(terms).map(([language, words]) => ({
          conceptId: concept.id,
          language,
          ...words,
        })),
      })
    })

    return this.#concept(concept.id)
  }

  async setConceptStatus(input: GlossaryStatusInput) {
    const concept = await this.#concept(input.conceptId)

    await this.#requireRights({
      workspaceId: concept.workspaceId,
      touched: Object.keys(concept.terms),
    })

    await this.#context.db.glossaryConcepts.update({
      where: { id: concept.id },
      data: { status: input.status },
    })

    return this.#concept(concept.id)
  }

  async removeConcept(input: GlossaryConceptRefInput) {
    const concept = await this.#concept(input.conceptId)

    await this.#requireRights({
      workspaceId: concept.workspaceId,
      touched: Object.keys(concept.terms),
    })

    await this.#context.db.glossaryConcepts.delete({ where: { id: concept.id } })

    return { removed: true as const }
  }

  async #concepts(options: { workspaceId: string; status?: GlossaryTermStatus | undefined }) {
    const concepts = await this.#context.db.glossaryConcepts.findMany({
      where: {
        workspaceId: options.workspaceId,
        ...(options.status ? { status: options.status } : {}),
      },
      include: { terms: true },
      orderBy: { name: 'asc' },
    })

    return concepts.map(toGlossaryTerm)
  }

  async #concept(conceptId: string) {
    const concept = await this.#context.db.glossaryConcepts.findFirst({
      where: { id: conceptId },
      include: { terms: true },
    })

    if (!concept) {
      throw new ORPCError('NOT_FOUND')
    }

    const access = new WorkspaceAccessService(this.#context)

    await access.membershipOf(concept.workspaceId)

    return { ...toGlossaryTerm(concept), workspaceId: concept.workspaceId }
  }

  async #requireRights(options: { workspaceId: string; touched: string[] }) {
    const membership = await new WorkspaceAccessService(this.#context).membershipOf(
      options.workspaceId,
    )

    if (
      !mayChangeLanguages({
        role: membership.role,
        languages: membership.languages,
        touched: options.touched,
      })
    ) {
      throw new ORPCError('FORBIDDEN', { message: GLOSSARY_ERRORS.FORBIDDEN.message })
    }
  }

  async #requireFreeName(options: { workspaceId: string; name: string }) {
    const names = await this.#context.db.glossaryConcepts.findMany({
      where: { workspaceId: options.workspaceId },
    })

    const wanted = options.name.toLocaleLowerCase()

    if (names.some(({ name }) => name.toLocaleLowerCase() === wanted)) {
      throw new ORPCError('CONFLICT')
    }
  }
}
