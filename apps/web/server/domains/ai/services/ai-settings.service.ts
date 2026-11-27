import type {
  AiRemoveKeyInput,
  AiSetKeyInput,
  AiSettingsView,
  AiUpdateSettingsInput,
  WorkspaceRefInput,
} from '@glot/contract'
import {
  AI_DEFAULT_MODELS,
  AI_DEFAULT_MONTHLY_BUDGET_MICROS,
  AI_DEFAULT_PROVIDER,
  AI_FILL_STOP_REASONS,
  AI_PROVIDERS,
} from '@glot/database/constants/ai'
import type { AiProvider } from '@glot/database/types/ai'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import { microsOf, usdOf } from '../utils/ai-cost.utils.ts'
import { decryptSecret, encryptSecret } from '../utils/ai-secret.utils.ts'

export class AiSettingsService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async get(input: WorkspaceRefInput): Promise<AiSettingsView> {
    await this.#requireManager(input.workspaceId)

    return this.#view(input.workspaceId)
  }

  async update(input: AiUpdateSettingsInput): Promise<AiSettingsView> {
    await this.#requireManager(input.workspaceId)

    const settings = {
      provider: input.provider,
      model: input.model,
      monthlyBudgetMicros: microsOf(input.monthlyBudgetUsd),
    }

    await this.#context.db.aiSettings.upsert({
      where: { workspaceId: input.workspaceId },
      create: { workspaceId: input.workspaceId, ...settings },
      update: settings,
    })

    return this.#view(input.workspaceId)
  }

  async setKey(input: AiSetKeyInput) {
    await this.#requireManager(input.workspaceId)

    const stored = {
      ciphertext: encryptSecret({ key: this.#context.ai.encryptionKey, value: input.key }),
      last4: input.key.slice(-4),
    }

    await this.#context.db.aiKeys.upsert({
      where: { workspaceId: input.workspaceId, provider: input.provider },
      create: { workspaceId: input.workspaceId, provider: input.provider, ...stored },
      update: stored,
    })

    return { provider: input.provider, set: true, last4: stored.last4 }
  }

  async removeKey(input: AiRemoveKeyInput) {
    await this.#requireManager(input.workspaceId)

    await this.#context.db.aiKeys.deleteMany({
      where: { workspaceId: input.workspaceId, provider: input.provider },
    })

    return { provider: input.provider, set: false, last4: null }
  }

  async resolve(workspaceId: string) {
    const [settings, keys] = await Promise.all([
      this.#context.db.aiSettings.findFirst({ where: { workspaceId } }),
      this.#context.db.aiKeys.findMany({ where: { workspaceId } }),
    ])

    const provider = settings?.provider ?? AI_DEFAULT_PROVIDER
    const stored = keys.find((key) => key.provider === provider)

    if (!stored) {
      throw new ORPCError('CONFLICT', {
        message: `No ${provider} key is stored for this workspace`,
        data: { reason: AI_FILL_STOP_REASONS.NO_KEY },
      })
    }

    const apiKey = decryptSecret({
      key: this.#context.ai.encryptionKey,
      ciphertext: stored.ciphertext,
    })

    if (apiKey === null) {
      throw new ORPCError('CONFLICT', { message: 'The stored key cannot be read: set it again' })
    }

    return {
      provider,
      model: settings?.model ?? AI_DEFAULT_MODELS[provider],
      budgetMicros: settings?.monthlyBudgetMicros ?? AI_DEFAULT_MONTHLY_BUDGET_MICROS,
      apiKey,
    }
  }

  async budgetMicros(workspaceId: string) {
    const settings = await this.#context.db.aiSettings.findFirst({ where: { workspaceId } })

    return settings?.monthlyBudgetMicros ?? AI_DEFAULT_MONTHLY_BUDGET_MICROS
  }

  #requireManager(workspaceId: string) {
    return new WorkspaceAccessService(this.#context).requireManager({ workspaceId })
  }

  async #view(workspaceId: string): Promise<AiSettingsView> {
    const [settings, keys] = await Promise.all([
      this.#context.db.aiSettings.findFirst({ where: { workspaceId } }),
      this.#context.db.aiKeys.findMany({ where: { workspaceId } }),
    ])

    const provider: AiProvider = settings?.provider ?? AI_DEFAULT_PROVIDER

    return {
      provider,
      model: settings?.model ?? AI_DEFAULT_MODELS[provider],
      monthlyBudgetUsd: usdOf(settings?.monthlyBudgetMicros ?? AI_DEFAULT_MONTHLY_BUDGET_MICROS),
      keys: Object.values(AI_PROVIDERS).map((name) => {
        const stored = keys.find((key) => key.provider === name)

        return { provider: name, set: Boolean(stored), last4: stored?.last4 ?? null }
      }),
      defaults: Object.values(AI_PROVIDERS).map((name) => ({
        provider: name,
        model: AI_DEFAULT_MODELS[name],
      })),
    }
  }
}
