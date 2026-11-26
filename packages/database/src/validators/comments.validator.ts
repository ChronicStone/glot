import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { commentKindEnum, comments } from '../schemas/comments/comments.schema.ts'

export const commentSelectSchema = createSelectSchema(comments)
export const commentInsertSchema = createInsertSchema(comments)
export const commentKindSchema = createSelectSchema(commentKindEnum)
