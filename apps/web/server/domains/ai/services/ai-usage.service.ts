import type { AiUsageView, WorkspaceRefInput } from '@glot/contract'
import { AI_FILL_STOP_REASONS, AI_USAGE_KINDS } from '@glot/database/constants/ai'
import type { AiProvider, AiUsageKind } from '@glot/database/types/ai'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { WorkspaceAccessService } from '../../people/services/workspace-access.service.ts'
import {
  costMicros,
  dayKey,
  monthDays,
  monthEnd,
  monthKey,
  monthStart,
  usdOf,
} from '../utils/ai-cost.utils.ts'
import { AiSettingsService } from './ai-settings.service.ts'

export class AiUsageService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async usage(input: WorkspaceRefInput): Promise<AiUsageView> {
    await new WorkspaceAccessService(this.#context).requireManager({
      workspaceId: input.workspaceId,
    })

    const now = new Date()
    const rows = await this.#month({ workspaceId: input.workspaceId, now })
    const budget = await new AiSettingsService(this.#context).budgetMicros(input.workspaceId)
    const spent = rows.reduce((sum, row) => sum + row.costMicros, 0)

    return {
      month: monthKey(now),
      spentUsd: usdOf(spent),
      budgetUsd: usdOf(budget),
      remainingUsd: usdOf(Math.max(budget - spent, 0)),
      calls: rows.length,
      inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
      outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
      languages: [...new Set(rows.map(({ language }) => language))].toSorted().map((language) => {
        const own = rows.filter((row) => row.language === language)

        return {
          language,
          texts: own.reduce((sum, row) => sum + row.texts, 0),
          costUsd: usdOf(own.reduce((sum, row) => sum + row.costMicros, 0)),
        }
      }),
      days: monthDays(now).map((date) => {
        const own = rows.filter((row) => dayKey(row.createdAt) === date)

        return {
          date,
          texts: own.reduce((sum, row) => sum + row.texts, 0),
          costUsd: usdOf(own.reduce((sum, row) => sum + row.costMicros, 0)),
        }
      }),
      kinds: Object.values(AI_USAGE_KINDS).map((kind) => {
        const own = rows.filter((row) => row.kind === kind)

        return {
          kind,
          texts: own.reduce((sum, row) => sum + row.texts, 0),
          costUsd: usdOf(own.reduce((sum, row) => sum + row.costMicros, 0)),
        }
      }),
    }
  }

  async requireBudget(workspaceId: string) {
    const [rows, budget] = await Promise.all([
      this.#month({ workspaceId, now: new Date() }),
      new AiSettingsService(this.#context).budgetMicros(workspaceId),
    ])

    if (rows.reduce((sum, row) => sum + row.costMicros, 0) >= budget) {
      throw new ORPCError('CONFLICT', {
        message: 'The monthly AI budget is reached',
        data: { reason: AI_FILL_STOP_REASONS.BUDGET_REACHED },
      })
    }
  }

  async record(options: {
    workspaceId: string
    projectId: string
    language: string
    kind: AiUsageKind
    provider: AiProvider
    model: string
    inputTokens: number
    outputTokens: number
    texts: number
  }) {
    const cost = costMicros(options)

    await this.#context.db.aiUsage.create({
      data: { ...options, userId: actorUserId(this.#context.actor), costMicros: cost },
    })

    return cost
  }

  #month(options: { workspaceId: string; now: Date }) {
    return this.#context.db.aiUsage.findMany({
      where: {
        workspaceId: options.workspaceId,
        createdAt: { gte: monthStart(options.now), lt: monthEnd(options.now) },
      },
    })
  }
}
