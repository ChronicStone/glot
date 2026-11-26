import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import { draftSaveInputSchema, draftSchema } from '../validators/drafts.validator.ts'

export const draftsContract = {
  save: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/drafts',
        operationId: 'saveDraft',
        summary: 'Save a draft',
        description:
          'Save a change to one text in one language. Only its author sees it until it is sent for review.',
        tags: ['drafts'],
      }),
    )
    .input(draftSaveInputSchema)
    .output(draftSchema)
    .errors(NOT_FOUND_ERRORS),
}
