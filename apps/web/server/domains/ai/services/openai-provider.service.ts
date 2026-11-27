import { AI_STOPS } from '../constants/ai.constants.ts'
import type { AiCompletion, AiCompletionRequest, AiProviderClient } from '../types/ai.types.ts'
import { openaiResponseSchema } from '../validators/ai-answer.validator.ts'
import { AiHttpService } from './ai-http.service.ts'

export class OpenAiProvider implements AiProviderClient {
  readonly #http: AiHttpService

  constructor(options: { baseUrl: string }) {
    this.#http = new AiHttpService(options)
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const response = openaiResponseSchema.parse(
      await this.#http.post({
        path: '/v1/responses',
        headers: { authorization: `Bearer ${request.apiKey}` },
        body: {
          model: request.model,
          instructions: request.system,
          input: request.prompt,
          max_output_tokens: request.maxTokens,
          store: false,
        },
      }),
    )

    const content = response.output
      .filter(({ type }) => type === 'message')
      .flatMap((message) => message.content ?? [])

    const refused = content.some(({ type }) => type === 'refusal')

    return {
      stopped: refused
        ? AI_STOPS.REFUSED
        : response.status === 'incomplete'
          ? AI_STOPS.CUT_SHORT
          : null,
      text: content
        .flatMap((part) => (part.type === 'output_text' ? [part.text ?? ''] : []))
        .join(''),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
