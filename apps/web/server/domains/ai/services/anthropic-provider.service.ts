import { ORPCError } from '@orpc/server'
import { AI_ANTHROPIC_VERSION } from '../constants/ai.constants.ts'
import type { AiCompletion, AiCompletionRequest, AiProviderClient } from '../types/ai.types.ts'
import { anthropicResponseSchema } from '../validators/ai-answer.validator.ts'
import { AiHttpService } from './ai-http.service.ts'

export class AnthropicProvider implements AiProviderClient {
  readonly #http: AiHttpService

  constructor(options: { baseUrl: string }) {
    this.#http = new AiHttpService(options)
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const response = anthropicResponseSchema.parse(
      await this.#http.post({
        path: '/v1/messages',
        headers: { 'x-api-key': request.apiKey, 'anthropic-version': AI_ANTHROPIC_VERSION },
        body: {
          model: request.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
        },
      }),
    )

    if (response.stop_reason === 'refusal') {
      throw new ORPCError('BAD_GATEWAY', { message: 'The AI provider declined to answer' })
    }

    if (response.stop_reason === 'max_tokens') {
      throw new ORPCError('BAD_GATEWAY', { message: 'The AI answer was cut short' })
    }

    return {
      text: response.content
        .flatMap((block) => (block.type === 'text' ? [block.text ?? ''] : []))
        .join(''),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
