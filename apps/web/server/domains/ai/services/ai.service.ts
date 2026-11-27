import type { AiFillMissingInput, AiFillsInput, AiSuggestInput } from '@glot/contract'
import { AI_USAGE_KINDS } from '@glot/database/constants/ai'
import { JOB_KINDS, JOB_STATUSES } from '@glot/database/constants/jobs'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { actorUserId } from '../../../utils/actor.utils.ts'
import { GlossaryService } from '../../glossary/services/glossary.service.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import { RightsService } from '../../reviews/services/rights.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { AI_FILL_JOB } from '../constants/ai.constants.ts'
import { usdOf } from '../utils/ai-cost.utils.ts'
import { fillView } from '../utils/ai-fill.utils.ts'
import { AiFillPlanService } from './ai-fill-plan.service.ts'
import { AiSettingsService } from './ai-settings.service.ts'
import { AiTranslatorService } from './ai-translator.service.ts'
import { AiUsageService } from './ai-usage.service.ts'

export class AiService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async suggest(input: AiSuggestInput) {
    const { project } = await new RightsService(this.#context).requireWrite(input)
    const texts = new TextsService(this.#context)
    const text = await texts.get(input)

    if (!text.translations.some(({ language }) => language === input.language)) {
      throw new ORPCError('NOT_FOUND')
    }

    const glossary = await new GlossaryService(this.#context).list({
      projectId: input.projectId,
      language: input.language,
    })

    const { results, usage, provider, model } = await new AiTranslatorService(
      this.#context,
    ).translate({
      project,
      language: input.language,
      texts: [text],
      glossary,
      kind: AI_USAGE_KINDS.SUGGEST,
    })

    const [result] = results

    if (!result || result.value === null) {
      throw new ORPCError('UNPROCESSABLE_CONTENT', {
        message: `The AI answer broke a placeholder twice and was refused: ${result?.problems.join('; ') ?? 'no answer'}`,
      })
    }

    return {
      value: result.value,
      reason: result.reason,
      failures: texts.failures({
        words: await texts.words(project.workspaceId),
        language: input.language,
        source: text.source.value,
        target: result.value,
      }),
      provider,
      model,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: usdOf(usage.costMicros),
      },
    }
  }

  async fillMissing(input: AiFillMissingInput) {
    const { project, texts } = await new AiFillPlanService(this.#context).missing(input)

    await new AiSettingsService(this.#context).resolve(project.workspaceId)
    await new AiUsageService(this.#context).requireBudget(project.workspaceId)

    const waiting = await this.#context.db.aiFills.findFirst({
      where: {
        projectId: project.id,
        language: input.language,
        job: { is: { status: { in: [JOB_STATUSES.PENDING, JOB_STATUSES.RUNNING] } } },
      },
      include: { job: true, requestedBy: true },
    })

    if (waiting) {
      return fillView(waiting)
    }

    if (texts.length === 0) {
      throw new ORPCError('CONFLICT', {
        message: 'Nothing is missing in this language, or every missing text already has a draft',
      })
    }

    const fill = await this.#context.db.transaction(async (tx) => {
      const job = await tx.jobs.create({
        data: { kind: JOB_KINDS.AI_FILL, projectId: project.id, runAt: new Date() },
      })

      return tx.aiFills.create({
        data: {
          jobId: job.id,
          projectId: project.id,
          language: input.language,
          requestedById: actorUserId(this.#context.actor),
          total: texts.length,
        },
        include: { job: true, requestedBy: true },
      })
    })

    return fillView(fill)
  }

  async fills(input: AiFillsInput) {
    await new ProjectsService(this.#context).findAccessible(input.projectId)

    const fills = await this.#context.db.aiFills.findMany({
      where: { projectId: input.projectId },
      include: { job: true, requestedBy: true },
      orderBy: { createdAt: 'desc' },
      take: AI_FILL_JOB.LATEST_FILLS,
    })

    return fills.map(fillView)
  }
}
