import type { ConflictReason } from '@glot/contract'
import type { Draft } from '@glot/database'
import type { CatalogEntry, ReviewLine } from '../../catalogs/types/catalog.types.ts'

export interface PlannedChange {
  draft: Draft
  entry: CatalogEntry
  previousValue: string | null
}

export interface PlannedLine {
  approvalId: string
  language: string
  line: ReviewLine
}

export interface ReleaseConflict {
  draft: Draft
  reason: ConflictReason
}

export interface ReleasePlan {
  changes: PlannedChange[]
  landed: Draft[]
  conflicts: ReleaseConflict[]
  lines: PlannedLine[]
}
