import { protectMessage, restoreMessage } from '@glot/checks'
import type { GlossaryTerm, Text } from '@glot/contract'
import { AI_PROVIDERS } from '@glot/database/constants/ai'
import type { AiProvider, AiUsageKind } from '@glot/database/types/ai'
import type { RequestContext } from '../../../types/context.types.ts'
import { ORPCError } from '@orpc/server'
import { AI_BATCH, AI_STOP_MESSAGES } from '../constants/ai.constants.ts'
import type { AiProviderClient } from '../types/ai.types.ts'
import { parseAnswers } from '../utils/ai-answer.utils.ts'
import { AI_SYSTEM_PROMPT, translationPrompt } from '../utils/ai-prompt.utils.ts'
import { AiSettingsService } from './ai-settings.service.ts'
import { AiUsageService } from './ai-usage.service.ts'
import { AnthropicProvider } from './anthropic-provider.service.ts'
import { OpenAiProvider } from './openai-provider.service.ts'

export class AiTranslatorService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async translate(options: {
    project: { id: string; workspaceId: string; sourceLanguage: string }
    language: string
    texts: Text[]
    glossary: GlossaryTerm[]
    kind: AiUsageKind
  }) {
    const { project, language } = options
    const settings = await new AiSettingsService(this.#context).resolve(project.workspaceId)
    const usage = new AiUsageService(this.#context)
    const provider = this.#provider(settings.provider)

    const items = options.texts.map((text, index) => {
      const { text: protectedText, tokens } = protectMessage(text.source.value, {
        syntax: text.syntax,
      })

      const problems: string[] = []

      return { id: index + 1, text, protectedText, tokens, problems }
    })

    const accepted = new Map<number, { value: string; reason: string }>()
    let pending = items
    const totals = { inputTokens: 0, outputTokens: 0, costMicros: 0 }

    for (let attempt = 0; attempt <= AI_BATCH.RETRIES && pending.length > 0; attempt += 1) {
      await usage.requireBudget(project.workspaceId)

      const completion = await provider.complete({
        model: settings.model,
        apiKey: settings.apiKey,
        system: AI_SYSTEM_PROMPT,
        prompt: translationPrompt({
          sourceLanguage: project.sourceLanguage,
          language,
          glossary: options.glossary,
          items: pending,
        }),
        maxTokens: AI_BATCH.MAX_OUTPUT_TOKENS,
      })

      if (completion.stopped) {
        await usage.record({
          workspaceId: project.workspaceId,
          projectId: project.id,
          language,
          kind: options.kind,
          provider: settings.provider,
          model: settings.model,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          texts: 0,
        })

        throw new ORPCError('BAD_GATEWAY', { message: AI_STOP_MESSAGES[completion.stopped] })
      }

      const answers = parseAnswers(completion.text)
      const refused: typeof pending = []

      for (const item of pending) {
        const answer = answers?.get(item.id)

        const restored = answer
          ? restoreMessage({ text: answer.text, tokens: item.tokens })
          : {
              value: null,
              problems: ['The answer was not the JSON asked for, or skipped this text'],
            }

        if (answer && restored.value !== null) {
          accepted.set(item.id, { value: restored.value, reason: answer.reason })
        } else {
          refused.push({ ...item, problems: restored.problems })
        }
      }

      totals.inputTokens += completion.inputTokens
      totals.outputTokens += completion.outputTokens

      totals.costMicros += await usage.record({
        workspaceId: project.workspaceId,
        projectId: project.id,
        language,
        kind: options.kind,
        provider: settings.provider,
        model: settings.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        texts: pending.length - refused.length,
      })

      pending = refused
    }

    const problems = new Map(pending.map(({ id, problems: found }) => [id, found]))

    return {
      provider: settings.provider,
      model: settings.model,
      usage: totals,
      results: items.map(({ id, text }) => ({
        text,
        value: accepted.get(id)?.value ?? null,
        reason: accepted.get(id)?.reason ?? '',
        problems: problems.get(id) ?? [],
      })),
    }
  }

  #provider(provider: AiProvider): AiProviderClient {
    const baseUrl = this.#context.ai.baseUrls[provider]

    return provider === AI_PROVIDERS.ANTHROPIC
      ? new AnthropicProvider({ baseUrl })
      : new OpenAiProvider({ baseUrl })
  }
}
