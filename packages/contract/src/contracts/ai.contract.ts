import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import { AI_ERRORS, AI_SETUP_ERRORS, PEOPLE_ONLY_ERRORS } from '../constants/contract.constants.ts'
import {
  aiFillMissingInputSchema,
  aiFillSchema,
  aiFillsInputSchema,
  aiKeyStatusSchema,
  aiRemoveKeyInputSchema,
  aiSetKeyInputSchema,
  aiSettingsSchema,
  aiSuggestInputSchema,
  aiSuggestionSchema,
  aiUpdateSettingsInputSchema,
  aiUsageInputSchema,
  aiUsageSchema,
} from '../validators/ai.validator.ts'
import { workspaceRefInputSchema } from '../validators/people.validator.ts'

const PEOPLE_ONLY_SETUP_ERRORS = { ...AI_SETUP_ERRORS, ...PEOPLE_ONLY_ERRORS }

export const aiContract = {
  settings: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/ai/settings',
        operationId: 'getAiSettings',
        summary: 'See how AI is set up',
        description:
          'The provider, the model, the monthly budget and, for each provider, whether a key is stored and its last 4 characters. Keys are never returned. Owners and admins.',
        tags: ['ai'],
      }),
    )
    .input(workspaceRefInputSchema)
    .output(aiSettingsSchema)
    .errors(AI_SETUP_ERRORS),
  updateSettings: oc
    .meta(
      openapi({
        method: 'PUT',
        path: '/workspaces/{workspaceId}/ai/settings',
        operationId: 'updateAiSettings',
        summary: 'Choose the provider, the model and the monthly budget',
        description: 'Owners and admins. People only.',
        tags: ['ai'],
      }),
    )
    .input(aiUpdateSettingsInputSchema)
    .output(aiSettingsSchema)
    .errors(PEOPLE_ONLY_SETUP_ERRORS),
  setKey: oc
    .meta(
      openapi({
        method: 'PUT',
        path: '/workspaces/{workspaceId}/ai/keys/{provider}',
        operationId: 'setAiKey',
        summary: 'Store a provider key',
        description:
          'The key is encrypted at rest and never returned; only whether it is set and its last 4 characters are. Owners and admins. People only.',
        tags: ['ai'],
      }),
    )
    .input(aiSetKeyInputSchema)
    .output(aiKeyStatusSchema)
    .errors(PEOPLE_ONLY_SETUP_ERRORS),
  removeKey: oc
    .meta(
      openapi({
        method: 'DELETE',
        path: '/workspaces/{workspaceId}/ai/keys/{provider}',
        operationId: 'removeAiKey',
        summary: 'Delete a provider key',
        description: 'Owners and admins. People only.',
        tags: ['ai'],
      }),
    )
    .input(aiRemoveKeyInputSchema)
    .output(aiKeyStatusSchema)
    .errors(PEOPLE_ONLY_SETUP_ERRORS),
  usage: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/ai/usage',
        operationId: 'getAiUsage',
        summary: 'See what AI cost this month',
        description:
          'The month so far in US dollars against the budget, the tokens used, and per language how many texts AI wrote or suggested and what they cost. Owners and admins.',
        tags: ['ai'],
      }),
    )
    .input(aiUsageInputSchema)
    .output(aiUsageSchema)
    .errors(AI_SETUP_ERRORS),
  suggest: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/texts/{textId}/ai/suggestion',
        operationId: 'suggestTextWithAi',
        summary: 'Ask AI to suggest a text in one language',
        description:
          'Returns a suggestion and a short reason without saving anything. Placeholders, links and tags of the source are kept exactly; an answer that breaks one is refused. Save the suggestion with saveDraft and aiWritten set to true. AI text is never approved automatically. Needs the right to change the language.',
        tags: ['ai'],
      }),
    )
    .input(aiSuggestInputSchema)
    .output(aiSuggestionSchema)
    .errors(AI_ERRORS),
  fillMissing: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/ai/fills',
        operationId: 'fillMissingTextsWithAi',
        summary: 'Fill the missing texts of a language with AI',
        description:
          'Queues a run for the clock: it writes the missing texts in batches as drafts sent for review, marked as written by AI, in the name of the caller, and stops when the monthly budget is reached. Texts that already have a draft are left alone, so running it again never duplicates. Returns the run, or the one already waiting for this language. Needs the right to change the language.',
        tags: ['ai'],
      }),
    )
    .input(aiFillMissingInputSchema)
    .output(aiFillSchema)
    .errors(AI_ERRORS),
  fills: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/ai/fills',
        operationId: 'listAiFills',
        summary: 'List the latest AI fills of a project',
        description:
          'Newest first: status (queued, running, done or partial with its reason), texts found, filled and left out.',
        tags: ['ai'],
      }),
    )
    .input(aiFillsInputSchema)
    .output(z.array(aiFillSchema))
    .errors(AI_ERRORS),
}
