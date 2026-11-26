import type { CheckFailure } from '@glot/checks'
import type { GlossaryTerm, KeyRef } from '@glot/contract'
import type { Project, ProjectSource } from '@glot/database'
import type * as z from 'zod'
import type { reviewLineSchema } from '../validators/review-line.validator.ts'

export interface GitReader {
  head(options: { repository: string; branch: string }): Promise<string>
  files(options: {
    repository: string
    commit: string
    paths: string[]
  }): Promise<Map<string, string>>
}

export interface GitPublication {
  repository: string
  branch: string
  base: { branch: string; commit: string }
  message: string
  files: Map<string, string>
  pullRequest: { title: string; body: string }
}

export interface GitPublished {
  commit: string
  pullRequest: { number: number; url: string } | null
}

export interface GitWriter {
  publish(options: GitPublication): Promise<GitPublished>
}

export interface MessageEdit {
  path: string[]
  value: string
}

export type ReviewLine = z.infer<typeof reviewLineSchema>

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
  releasedSelfApproved: Set<string>
}

export interface CatalogServiceOptions {
  reader: GitReader
  glossary: Record<string, GlossaryTerm[]>
}
