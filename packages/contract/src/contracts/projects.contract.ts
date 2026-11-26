import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import { NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import {
  projectSchema,
  projectSyncInputSchema,
  projectSyncSchema,
} from '../validators/projects.validator.ts'

export const projectsContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects',
        operationId: 'listProjects',
        summary: 'List projects',
        description:
          'The projects (git repositories) of the workspace, with their languages, sources and apps.',
        tags: ['projects'],
      }),
    )
    .output(z.array(projectSchema)),
  sync: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/sync',
        operationId: 'syncProject',
        summary: 'Read the repository again',
        description:
          "Read the project's default branch now instead of waiting for the next refresh, so a commit just pushed shows in its texts.",
        tags: ['projects'],
      }),
    )
    .input(projectSyncInputSchema)
    .output(projectSyncSchema)
    .errors(NOT_FOUND_ERRORS),
}
