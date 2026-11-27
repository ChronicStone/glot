import type { AiProvider } from '@glot/database/types/ai'

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

export interface AiCompletion {
  text: string
  inputTokens: number
  outputTokens: number
}

export interface AiProviderClient {
  complete(request: AiCompletionRequest): Promise<AiCompletion>
}
