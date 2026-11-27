import { ORPCError } from '@orpc/server'
import { AI_HTTP } from '../constants/ai.constants.ts'
import { providerErrorSchema } from '../validators/ai-answer.validator.ts'

export class AiHttpService {
  readonly #baseUrl: string

  constructor(options: { baseUrl: string }) {
    this.#baseUrl = options.baseUrl.replace(/\/+$/u, '')
  }

  async post(options: { path: string; headers: Record<string, string>; body: unknown }) {
    for (let attempt = 1; ; attempt += 1) {
      const response = await this.#send(options)

      if (response.ok) {
        const body: unknown = await response.json()

        return body
      }

      const retryable = response.status === 429 || response.status >= 500

      if (!retryable || attempt >= AI_HTTP.ATTEMPTS) {
        throw new ORPCError('BAD_GATEWAY', {
          message: `The AI provider answered ${response.status}: ${await this.#reason(response)}`,
        })
      }

      await this.#wait({ response, attempt })
    }
  }

  async #send(options: { path: string; headers: Record<string, string>; body: unknown }) {
    try {
      return await fetch(`${this.#baseUrl}${options.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...options.headers },
        body: JSON.stringify(options.body),
        signal: AbortSignal.timeout(AI_HTTP.TIMEOUT_MS),
      })
    } catch (error) {
      throw new ORPCError('BAD_GATEWAY', {
        message: `The AI provider cannot be reached: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  async #reason(response: Response) {
    const text = await response.text()

    try {
      return providerErrorSchema.parse(JSON.parse(text)).error.message
    } catch {
      return text.slice(0, 200) || response.statusText
    }
  }

  #wait(options: { response: Response; attempt: number }) {
    const header = options.response.headers.get('retry-after')
    const seconds = header === null || header.trim() === '' ? Number.NaN : Number(header)

    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : AI_HTTP.DEFAULT_DELAY_MS * options.attempt

    return new Promise((resolve) => setTimeout(resolve, Math.min(delay, AI_HTTP.MAX_DELAY_MS)))
  }
}
