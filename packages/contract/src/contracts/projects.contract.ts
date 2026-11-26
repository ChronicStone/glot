import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import {
  ADMIN_ONLY_ERRORS,
  NOT_FOUND_ERRORS,
  PROJECT_ERRORS,
} from '../constants/contract.constants.ts'
import {
  projectCreateInputSchema,
  projectSchema,
  projectSyncInputSchema,
  projectSyncSchema,
  projectUpdateInputSchema,
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
  create: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/workspaces/{workspaceId}/projects',
        operationId: 'createProject',
        summary: 'Add a repository as a project',
        description: 'Its sources say where the language files are. Admins only.',
        tags: ['projects'],
      }),
    )
    .input(projectCreateInputSchema)
    .output(projectSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS, ...PROJECT_ERRORS }),
  update: oc
    .meta(
      openapi({
        method: 'PUT',
        path: '/projects/{projectId}',
        operationId: 'updateProject',
        summary: "Change a project's name, branch, languages and sources",
        tags: ['projects'],
      }),
    )
    .input(projectUpdateInputSchema)
    .output(projectSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS }),
}
