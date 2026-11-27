import type * as z from 'zod'
import type {
  aiFillMissingInputSchema,
  aiFillSchema,
  aiFillsInputSchema,
  aiRemoveKeyInputSchema,
  aiSetKeyInputSchema,
  aiSettingsSchema,
  aiSuggestInputSchema,
  aiSuggestionSchema,
  aiUpdateSettingsInputSchema,
  aiUsageSchema,
} from '../validators/ai.validator.ts'

export type AiSettingsView = z.infer<typeof aiSettingsSchema>

export type AiUpdateSettingsInput = z.infer<typeof aiUpdateSettingsInputSchema>

export type AiSetKeyInput = z.infer<typeof aiSetKeyInputSchema>

export type AiRemoveKeyInput = z.infer<typeof aiRemoveKeyInputSchema>

export type AiSuggestInput = z.infer<typeof aiSuggestInputSchema>

export type AiSuggestion = z.infer<typeof aiSuggestionSchema>

export type AiFillMissingInput = z.infer<typeof aiFillMissingInputSchema>

export type AiFillsInput = z.infer<typeof aiFillsInputSchema>

export type AiFillView = z.infer<typeof aiFillSchema>

export type AiUsageView = z.infer<typeof aiUsageSchema>
