import type { CatalogSource } from '../types/catalog.types.ts'

export class CatalogService {
  readonly #source: CatalogSource

  constructor(source: CatalogSource) {
    this.#source = source
  }

  texts(repository: string) {
    return this.#source.texts[repository] ?? []
  }

  glossary() {
    return this.#source.glossary
  }
}
