import type * as z from 'zod'
import type { draftSaveInputSchema, draftSchema } from '../validators/drafts.validator.ts'

export type DraftView = z.infer<typeof draftSchema>

export type DraftSaveInput = z.infer<typeof draftSaveInputSchema>
