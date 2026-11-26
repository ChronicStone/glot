import type { GlossaryTerm } from '@glot/contract'
import { CATALOG_CACHE } from '../constants/catalog.constants.ts'
import type {
  Catalog,
  CatalogProject,
  CatalogServiceOptions,
  GitReader,
} from '../types/catalog.types.ts'
import { buildEntries, catalogPaths, parseReleased } from '../utils/catalog.utils.ts'

export class CatalogService {
  readonly #reader: GitReader
  readonly #glossary: Record<string, GlossaryTerm[]>
  readonly #heads = new Map<string, { commit: string; readAt: number }>()
  readonly #catalogs = new Map<string, Promise<Catalog>>()

  constructor(options: CatalogServiceOptions) {
    this.#reader = options.reader
    this.#glossary = options.glossary
  }

  read(project: CatalogProject) {
    return this.#load({ project, fresh: false })
  }

  sync(project: CatalogProject) {
    return this.#load({ project, fresh: true })
  }

  async base(options: { project: CatalogProject; textId: string; language: string }) {
    const { entries } = await this.read(options.project)
    const entry = entries.find(({ id }) => id === options.textId)

    return {
      baseSourceHash: entry?.sourceHash ?? null,
      baseTargetHash:
        entry?.translations.find(({ language }) => language === options.language)?.hash ?? null,
    }
  }

  glossary(repository: string) {
    return this.#glossary[repository] ?? []
  }

  async #load(options: { project: CatalogProject; fresh: boolean }) {
    const { project } = options
    const commit = await this.#head(options)
    const key = JSON.stringify([project.id, commit, project.sources, project.languages])
    const cached = this.#catalogs.get(key)

    if (cached) {
      return cached
    }

    const loading = this.#read({ project, commit })

    this.#catalogs.set(key, loading)

    loading.catch(() => this.#catalogs.delete(key))

    for (const oldest of this.#catalogs.keys()) {
      if (this.#catalogs.size <= CATALOG_CACHE.MAX_CATALOGS) {
        break
      }

      this.#catalogs.delete(oldest)
    }

    return loading
  }

  async #head(options: { project: CatalogProject; fresh: boolean }) {
    const { repository, defaultBranch } = options.project
    const key = `${repository}#${defaultBranch}`
    const known = this.#heads.get(key)

    if (!options.fresh && known && Date.now() - known.readAt < CATALOG_CACHE.HEAD_TTL_MS) {
      return known.commit
    }

    const commit = await this.#reader.head({ repository, branch: defaultBranch })

    this.#heads.set(key, { commit, readAt: Date.now() })

    return commit
  }

  async #read(options: { project: CatalogProject; commit: string }) {
    const { project, commit } = options

    const files = await this.#reader.files({
      repository: project.repository,
      commit,
      paths: catalogPaths(project),
    })

    const { released, selfApproved } = parseReleased({ project, files })

    return {
      commit,
      entries: buildEntries({ project, files, glossary: this.glossary(project.repository) }),
      released,
      releasedSelfApproved: selfApproved,
    }
  }
}
