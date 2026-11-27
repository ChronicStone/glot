import { createSelectSchema } from 'drizzle-orm/zod'
import * as z from 'zod'
import { AI_FILL_STOP_REASONS, AI_PROVIDERS, AI_USAGE_KINDS } from '../constants/ai.constants.ts'
import { aiFills, aiSettings, aiUsage } from '../schemas/ai/ai.schema.ts'

export const aiProviderSchema = z.enum(AI_PROVIDERS)

export const aiFillStopReasonSchema = z.enum(AI_FILL_STOP_REASONS)

export const aiUsageKindSchema = z.enum(AI_USAGE_KINDS)

export const aiSettingsSelectSchema = createSelectSchema(aiSettings, { provider: aiProviderSchema })

export const aiUsageSelectSchema = createSelectSchema(aiUsage)

export const aiFillSelectSchema = createSelectSchema(aiFills, {
  stopReason: aiFillStopReasonSchema.nullable(),
})
