import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { LANGUAGE_RIGHTS_ERRORS } from '../constants/contract.constants.ts'
import {
  draftRefInputSchema,
  draftSaveInputSchema,
  draftSchema,
} from '../validators/drafts.validator.ts'

export const draftsContract = {
  save: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/drafts',
        operationId: 'saveDraft',
        summary: 'Save a draft',
        description:
          'Save a change to one text in one language. Saving again changes the same draft and takes it back from review. Only its author sees it until it is sent for review.',
        tags: ['drafts'],
      }),
    )
    .input(draftSaveInputSchema)
    .output(draftSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
  send: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/drafts/{draftId}/send',
        operationId: 'sendDraftForReview',
        summary: 'Send a draft for review',
        description:
          'Put a draft in the review queue of its language. A draft that fails a check cannot be sent.',
        tags: ['drafts'],
      }),
    )
    .input(draftRefInputSchema)
    .output(draftSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
  withdraw: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/drafts/{draftId}/withdraw',
        operationId: 'withdrawDraft',
        summary: 'Withdraw a draft',
        description: 'Give up a draft, sent for review or not. The text stays as it is.',
        tags: ['drafts'],
      }),
    )
    .input(draftRefInputSchema)
    .output(draftSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
}
