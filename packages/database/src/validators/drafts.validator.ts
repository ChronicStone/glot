import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { draftStatusEnum, drafts } from '../schemas/drafts/drafts.schema.ts'

export const draftSelectSchema = createSelectSchema(drafts)
export const draftInsertSchema = createInsertSchema(drafts)
export const draftStatusSchema = createSelectSchema(draftStatusEnum)
