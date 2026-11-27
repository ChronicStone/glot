import { deriveAiKey } from '../../server/domains/ai/utils/ai-secret.utils.ts'
import type { AiRuntime } from '../../server/domains/ai/types/ai.types.ts'

export function testAiRuntime(options: {
  secret: string
  baseUrl: string
  batchSize?: number
  concurrency?: number
}): AiRuntime {
  return {
    encryptionKey: deriveAiKey(options.secret),
    baseUrls: { ANTHROPIC: options.baseUrl, OPENAI: options.baseUrl },
    batchSize: options.batchSize ?? 20,
    concurrency: options.concurrency ?? 2,
  }
}
