import { releaseChangeSelectSchema, releaseSelectSchema } from '@glot/database/validators/releases'
import * as z from 'zod'
import { CONFLICT_REASONS, CONFLICT_RESOLUTIONS } from '../constants/contract.constants.ts'
import { draftRefInputSchema, draftSchema } from './drafts.validator.ts'
import { textSearchInputSchema } from './texts.validator.ts'

export const conflictReasonSchema = z.enum(CONFLICT_REASONS)

export const conflictResolutionSchema = z.enum(CONFLICT_RESOLUTIONS)

export const releaseProjectInputSchema = releaseSelectSchema.pick({ projectId: true })

export const releasePageInputSchema = releaseProjectInputSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: textSearchInputSchema.shape.cursor,
})

export const releaseSchema = releaseSelectSchema
  .pick({
    id: true,
    status: true,
    trigger: true,
    commit: true,
    pullRequestNumber: true,
    pullRequestUrl: true,
    createdAt: true,
    updatedAt: true,
    mergedAt: true,
  })
  .extend({
    startedByName: z.string().nullable().describe('Empty when the twice-a-day clock released it.'),
    changes: z.number().int().describe('Texts written by this release.'),
    approvals: z.number().int().describe('Approvals this release adds to the repository.'),
  })

export const releasePageSchema = z.object({
  items: z.array(releaseSchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
})

export const nextReleaseSchema = z.object({
  open: releaseSchema
    .nullable()
    .describe('The release whose pull request is waiting to be merged, if any.'),
  ready: z.object({
    changes: z.number().int().describe('Approved texts the next release writes.'),
    approvals: z.number().int().describe('Approvals the next release adds to the repository.'),
  }),
  conflicts: z.number().int().describe('Approved changes held back until their author decides.'),
  nextRunAt: z.date().describe('When the clock releases next.'),
})

export const releaseChangesInputSchema = releaseProjectInputSchema.extend({
  releaseId: releaseSelectSchema.shape.id,
  limit: releasePageInputSchema.shape.limit,
  cursor: releasePageInputSchema.shape.cursor,
})

export const releaseChangeSchema = releaseChangeSelectSchema
  .pick({ id: true, textId: true, language: true, previousValue: true, value: true })
  .extend({
    authorName: z.string().nullable(),
    undone: z.boolean().describe('True once a change restoring the previous text exists.'),
  })

export const releaseChangePageSchema = z.object({
  items: z.array(releaseChangeSchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
})

export const undoInputSchema = releaseChangesInputSchema
  .pick({ projectId: true, releaseId: true })
  .extend({ changeId: releaseChangeSelectSchema.shape.id })

export const conflictSchema = z.object({
  reason: conflictReasonSchema.describe(
    'Why the change cannot be written: the French changed, the text in the repository changed, or the text is gone.',
  ),
  draft: draftSchema,
  source: z.string().nullable().describe('The source text now, empty when the text is gone.'),
  current: z
    .string()
    .nullable()
    .describe('The text in the repository now, empty when it has none.'),
})

export const conflictPageSchema = z.object({
  items: z.array(conflictSchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
})

export const resolveConflictInputSchema = draftRefInputSchema.extend({
  resolution: conflictResolutionSchema.describe(
    'KEEP rebases the change on the text as it is now; LEAVE_OUT gives it up.',
  ),
})
