import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import { projectSchema } from '../validators/projects.validator.ts'

export const projectsContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects',
        operationId: 'listProjects',
        summary: 'List projects',
        description:
          'The projects (git repositories) of the workspace, with their languages and apps.',
        tags: ['projects'],
      }),
    )
    .output(z.array(projectSchema)),
}
