import { createSelectSchema } from 'drizzle-orm/zod'
import * as z from 'zod'
import { AI_FILL_STOP_REASONS, AI_PROVIDERS } from '../constants/ai.constants.ts'
import { aiFills, aiSettings, aiUsage } from '../schemas/ai/ai.schema.ts'

export const aiProviderSchema = z.enum(AI_PROVIDERS)

export const aiFillStopReasonSchema = z.enum(AI_FILL_STOP_REASONS)

export const aiSettingsSelectSchema = createSelectSchema(aiSettings, { provider: aiProviderSchema })

export const aiUsageSelectSchema = createSelectSchema(aiUsage)

export const aiFillSelectSchema = createSelectSchema(aiFills, {
  stopReason: aiFillStopReasonSchema.nullable(),
})
