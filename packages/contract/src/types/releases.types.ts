import type * as z from 'zod'
import type {
  conflictPageSchema,
  conflictReasonSchema,
  conflictResolutionSchema,
  conflictSchema,
  nextReleaseSchema,
  releaseChangePageSchema,
  releaseChangeSchema,
  releaseChangesInputSchema,
  releasePageInputSchema,
  releasePageSchema,
  releaseProjectInputSchema,
  releaseSchema,
  resolveConflictInputSchema,
  undoInputSchema,
} from '../validators/releases.validator.ts'

export type ConflictReason = z.infer<typeof conflictReasonSchema>

export type ConflictResolution = z.infer<typeof conflictResolutionSchema>

export type ReleaseProjectInput = z.infer<typeof releaseProjectInputSchema>

export type ReleasePageInput = z.infer<typeof releasePageInputSchema>

export type ReleaseView = z.infer<typeof releaseSchema>

export type ReleasePage = z.infer<typeof releasePageSchema>

export type NextRelease = z.infer<typeof nextReleaseSchema>

export type ReleaseChangesInput = z.infer<typeof releaseChangesInputSchema>

export type ReleaseChangeView = z.infer<typeof releaseChangeSchema>

export type ReleaseChangePage = z.infer<typeof releaseChangePageSchema>

export type UndoInput = z.infer<typeof undoInputSchema>

export type ConflictView = z.infer<typeof conflictSchema>

export type ConflictPage = z.infer<typeof conflictPageSchema>

export type ResolveConflictInput = z.infer<typeof resolveConflictInputSchema>
