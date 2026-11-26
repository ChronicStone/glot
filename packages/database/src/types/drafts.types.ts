import type { ValueOf } from '@glot/utils/types'
import type { DRAFT_STATUSES } from '../constants/drafts.constants.ts'
import type { drafts } from '../schemas/drafts/drafts.schema.ts'

export type Draft = typeof drafts.$inferSelect

export type DraftInsert = typeof drafts.$inferInsert

export type DraftStatus = ValueOf<typeof DRAFT_STATUSES>
