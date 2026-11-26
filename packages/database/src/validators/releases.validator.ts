import { createSelectSchema } from 'drizzle-orm/zod'
import { releaseChanges, releaseStatusEnum, releases } from '../schemas/releases/releases.schema.ts'

export const releaseSelectSchema = createSelectSchema(releases)
export const releaseChangeSelectSchema = createSelectSchema(releaseChanges)
export const releaseStatusSchema = createSelectSchema(releaseStatusEnum)
