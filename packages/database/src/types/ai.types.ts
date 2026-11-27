import type { ValueOf } from '@glot/utils/types'
import type {
  AI_FILL_STOP_REASONS,
  AI_PROVIDERS,
  AI_USAGE_KINDS,
} from '../constants/ai.constants.ts'
import type { aiFills, aiKeys, aiSettings, aiUsage } from '../schemas/ai/ai.schema.ts'

export type AiSettings = typeof aiSettings.$inferSelect

export type AiKey = typeof aiKeys.$inferSelect

export type AiUsage = typeof aiUsage.$inferSelect

export type AiFill = typeof aiFills.$inferSelect

export type AiProvider = ValueOf<typeof AI_PROVIDERS>

export type AiUsageKind = ValueOf<typeof AI_USAGE_KINDS>

export type AiFillStopReason = ValueOf<typeof AI_FILL_STOP_REASONS>
