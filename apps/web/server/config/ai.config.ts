import { AI_PROVIDERS } from '@glot/database/constants/ai'
import { AI_BATCH } from '../domains/ai/constants/ai.constants.ts'
import type { AiRuntime } from '../domains/ai/types/ai.types.ts'
import { deriveAiKey } from '../domains/ai/utils/ai-secret.utils.ts'
import { env } from '../env.ts'

export const ai: AiRuntime = {
  encryptionKey: deriveAiKey(env.AUTH_SECRET),
  baseUrls: {
    [AI_PROVIDERS.ANTHROPIC]: env.ANTHROPIC_BASE_URL,
    [AI_PROVIDERS.OPENAI]: env.OPENAI_BASE_URL,
  },
  batchSize: AI_BATCH.SIZE,
  concurrency: AI_BATCH.CONCURRENCY,
}
