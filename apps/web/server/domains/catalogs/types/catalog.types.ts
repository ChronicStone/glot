import type { CheckFailure } from '@glot/checks'
import type { GlossaryTerm, KeyRef } from '@glot/contract'
import type { Project, ProjectSource } from '@glot/database'

export interface GitReader {
  head(options: { repository: string; branch: string }): Promise<string>
  files(options: {
    repository: string
    commit: string
    paths: string[]
  }): Promise<Map<string, string>>
}

export type CatalogProject = Pick<
  Project,
  'id' | 'repository' | 'defaultBranch' | 'sourceLanguage' | 'languages'
> & { sources: ProjectSource[] }

export interface CatalogTranslation {
  language: string
  value: string | null
  hash: string | null
  failures: CheckFailure[]
}

export interface CatalogEntry {
  id: string
  key: KeyRef
  sourceLanguage: string
  sourceValue: string
  sourceHash: string
  translations: CatalogTranslation[]
}

export interface Catalog {
  commit: string
  entries: CatalogEntry[]
  released: Map<string, string>
}

export interface CatalogServiceOptions {
  reader: GitReader
  glossary: Record<string, GlossaryTerm[]>
}
