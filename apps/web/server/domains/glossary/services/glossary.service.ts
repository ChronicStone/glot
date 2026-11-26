import type { GlossaryListInput } from '@glot/contract'
import type { RequestContext } from '../../../types/context.types.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'

export class GlossaryService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async list(input: GlossaryListInput) {
    const project = await new ProjectsService(this.#context).findAccessible(input.projectId)

    return this.#context.catalog
      .glossary(project.repository)
      .filter((term) => !input.status || term.status === input.status)
      .filter((term) => !input.language || input.language in term.terms)
  }
}
