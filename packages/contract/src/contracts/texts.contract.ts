import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import {
  textPageSchema,
  textRefInputSchema,
  textSchema,
  textSearchInputSchema,
} from '../validators/texts.validator.ts'

export const textsContract = {
  search: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/texts',
        operationId: 'searchTexts',
        summary: 'Search texts',
        description:
          'Find texts by words in any language. Filter by state in one language. Texts come in the order of the project sources and their files.',
        tags: ['texts'],
      }),
    )
    .input(textSearchInputSchema)
    .output(textPageSchema)
    .errors(NOT_FOUND_ERRORS),
  get: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/texts/{textId}',
        operationId: 'getText',
        summary: 'Get a text in every language',
        tags: ['texts'],
      }),
    )
    .input(textRefInputSchema)
    .output(textSchema)
    .errors(NOT_FOUND_ERRORS),
}
