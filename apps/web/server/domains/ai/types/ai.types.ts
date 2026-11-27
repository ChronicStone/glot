import type { AiProvider } from '@glot/database/types/ai'
import type { ValueOf } from '@glot/utils/types'
import type { AI_STOPS } from '../constants/ai.constants.ts'

export interface AiRuntime {
  encryptionKey: Buffer
  baseUrls: Record<AiProvider, string>
  batchSize: number
  concurrency: number
}

export interface AiCompletionRequest {
  model: string
  apiKey: string
  system: string
  prompt: string
  maxTokens: number
}

export type AiStop = ValueOf<typeof AI_STOPS>

export interface AiCompletion {
  text: string
  inputTokens: number
  outputTokens: number
  stopped: AiStop | null
}

export interface AiProviderClient {
  complete(request: AiCompletionRequest): Promise<AiCompletion>
}
