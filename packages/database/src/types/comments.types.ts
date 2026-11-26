import type { ValueOf } from '@glot/utils/types'
import type { COMMENT_KINDS } from '../constants/comments.constants.ts'
import type { comments } from '../schemas/comments/comments.schema.ts'

export type Comment = typeof comments.$inferSelect

export type CommentInsert = typeof comments.$inferInsert

export type CommentKind = ValueOf<typeof COMMENT_KINDS>
