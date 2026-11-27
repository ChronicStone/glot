import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import { homeInputSchema, homeOverviewSchema } from '../validators/home.validator.ts'

export const homeContract = {
  overview: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/home',
        operationId: 'getHomeOverview',
        summary: 'See what needs you',
        description:
          'What needs the caller in a workspace: texts that read wrong in the languages they change (with the most seen first), the texts waiting for their review per language, their drafts, the changes held back by a conflict, the latest merged releases and, per project, how many texts are reviewed, to check, in need of a fix or missing in each language.',
        tags: ['home'],
      }),
    )
    .input(homeInputSchema)
    .output(homeOverviewSchema)
    .errors(NOT_FOUND_ERRORS),
}
