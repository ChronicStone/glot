import { checkFailureSchema } from '@glot/checks/validators'
import {
  aiFillSelectSchema,
  aiProviderSchema,
  aiSettingsSelectSchema,
} from '@glot/database/validators/ai'
import { userSelectSchema } from '@glot/database/validators/users'
import * as z from 'zod'
import { AI_FILL_STATUSES } from '../constants/contract.constants.ts'
import { languageCodeSchema } from './languages.validator.ts'
import { workspaceRefInputSchema } from './people.validator.ts'
import { reviewTargetInputSchema } from './reviews.validator.ts'

export { aiProviderSchema }

export const aiFillStatusSchema = z.enum(AI_FILL_STATUSES)

export const aiKeyStatusSchema = z.object({
  provider: aiProviderSchema,
  set: z.boolean().describe('Whether a key is stored. The key itself is never returned.'),
  last4: z.string().length(4).nullable().describe('The last 4 characters of the stored key.'),
})

export const aiSettingsSchema = z.object({
  provider: aiProviderSchema.describe('The provider Glot calls for this workspace.'),
  model: aiSettingsSelectSchema.shape.model,
  monthlyBudgetUsd: z
    .number()
    .min(0)
    .describe('What AI may cost in a calendar month (UTC), in US dollars.'),
  keys: z.array(aiKeyStatusSchema),
  defaults: z
    .array(z.object({ provider: aiProviderSchema, model: z.string() }))
    .describe('The model used for each provider until another is chosen.'),
})

export const aiUpdateSettingsInputSchema = workspaceRefInputSchema.extend({
  provider: aiProviderSchema,
  model: aiSettingsSelectSchema.shape.model.trim().min(1).max(100),
  monthlyBudgetUsd: aiSettingsSchema.shape.monthlyBudgetUsd.max(100_000),
})

export const aiSetKeyInputSchema = workspaceRefInputSchema.extend({
  provider: aiProviderSchema,
  key: z
    .string()
    .trim()
    .min(8)
    .max(500)
    .describe('The provider API key. Stored encrypted, never returned.'),
})

export const aiRemoveKeyInputSchema = aiSetKeyInputSchema.pick({
  workspaceId: true,
  provider: true,
})

export const aiSuggestInputSchema = reviewTargetInputSchema

export const aiSuggestionSchema = z.object({
  value: z
    .string()
    .describe('The suggested text, with every placeholder, link and tag of the source.'),
  reason: z.string().describe('One short sentence on why this wording.'),
  failures: z
    .array(checkFailureSchema)
    .describe('The checks the suggestion fails. A draft that fails a check cannot be sent.'),
  provider: aiProviderSchema,
  model: z.string(),
  usage: z.object({
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
    costUsd: z.number().min(0),
  }),
})

export const aiFillMissingInputSchema = z.object({
  projectId: aiFillSelectSchema.shape.projectId,
  language: languageCodeSchema,
})

export const aiFillsInputSchema = aiFillMissingInputSchema.pick({ projectId: true })

export const aiFillSchema = z.object({
  id: aiFillSelectSchema.shape.id,
  projectId: aiFillSelectSchema.shape.projectId,
  language: languageCodeSchema,
  status: aiFillStatusSchema.describe(
    'QUEUED until the clock picks it up, RUNNING, DONE, PARTIAL when it stopped early (see reason) or FAILED.',
  ),
  total: z.number().int().describe('Missing texts the run found.'),
  filled: z.number().int().describe('Drafts written and sent for review.'),
  rejected: z
    .number()
    .int()
    .describe('Texts left out because the answer broke a placeholder or a check.'),
  reason: z
    .object({ code: aiFillSelectSchema.shape.stopReason.unwrap(), message: z.string() })
    .nullable()
    .describe('Why a partial run stopped.'),
  requestedByName: userSelectSchema.shape.name,
  createdAt: aiFillSelectSchema.shape.createdAt,
  finishedAt: z.date().nullable(),
})

export const aiUsageInputSchema = workspaceRefInputSchema

export const aiUsageSchema = z.object({
  month: z.string().describe('The calendar month in UTC, such as 2026-11.'),
  spentUsd: z.number().min(0),
  budgetUsd: aiSettingsSchema.shape.monthlyBudgetUsd,
  remainingUsd: z.number().min(0),
  calls: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  languages: z.array(
    z.object({
      language: languageCodeSchema,
      texts: z.number().int().describe('Texts AI wrote or suggested this month.'),
      costUsd: z.number().min(0),
    }),
  ),
})
