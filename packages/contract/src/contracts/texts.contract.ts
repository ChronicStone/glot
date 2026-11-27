import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import {
  textListSchema,
  textPageSchema,
  textRefInputSchema,
  textSchema,
  textSearchInputSchema,
  textsByKeysInputSchema,
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
  byKeys: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/texts/by-keys',
        operationId: 'getTextsByKeys',
        summary: 'Get texts by their keys',
        description:
          "Get the texts an app shows, by the keys its code calls them with (dotted, such as marketplace.itemCard.outbid), in every language with their states and your draft. A key matches every text whose path joins to it, so ['a.b'] and ['a', 'b'] both answer a.b.",
        tags: ['texts'],
      }),
    )
    .input(textsByKeysInputSchema)
    .output(textListSchema)
    .errors(NOT_FOUND_ERRORS),
}
