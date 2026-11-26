import type { GlossaryTermStatus } from '@glot/database/types/glossary'
import type { RequestContext } from '../../../types/context.types.ts'

export class GlossaryService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  list(input: { language?: string | undefined; status?: GlossaryTermStatus | undefined }) {
    return this.#context.catalog
      .glossary()
      .filter((term) => !input.status || term.status === input.status)
      .filter((term) => !input.language || input.language in term.terms)
  }
}
