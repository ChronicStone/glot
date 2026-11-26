import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { NOT_FOUND_ERRORS, PEOPLE_ONLY_ERRORS } from '../constants/contract.constants.ts'
import { approveInputSchema } from '../validators/reviews.validator.ts'
import { textSchema } from '../validators/texts.validator.ts'

export const reviewsContract = {
  approve: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/reviews',
        operationId: 'approveText',
        summary: 'Approve a text',
        description:
          'Approve one text in one language against its current source text. People only.',
        tags: ['reviews'],
      }),
    )
    .input(approveInputSchema)
    .output(textSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...PEOPLE_ONLY_ERRORS }),
}
