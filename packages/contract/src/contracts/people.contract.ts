import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import {
  ADMIN_ONLY_ERRORS,
  MEMBERSHIP_ERRORS,
  NOT_FOUND_ERRORS,
  PEOPLE_ONLY_ERRORS,
} from '../constants/contract.constants.ts'
import {
  accessSchema,
  membershipRefInputSchema,
  personInviteInputSchema,
  personSchema,
  personUpdateInputSchema,
  preferencesSchema,
  workspaceRefInputSchema,
} from '../validators/people.validator.ts'

export const peopleContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/people',
        operationId: 'listPeople',
        summary: 'List the people of a workspace',
        description: 'Everyone with access, their role, the languages they change and until when.',
        tags: ['people'],
      }),
    )
    .input(workspaceRefInputSchema)
    .output(z.array(personSchema))
    .errors(NOT_FOUND_ERRORS),
  me: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/me',
        operationId: 'getMyAccess',
        summary: 'My access to a workspace',
        tags: ['people'],
      }),
    )
    .input(workspaceRefInputSchema)
    .output(accessSchema)
    .errors(NOT_FOUND_ERRORS),
  preferences: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/me/preferences',
        operationId: 'getMyPreferences',
        summary: 'My preferences',
        description: 'Whether the daily email of what needs the caller is sent to them.',
        tags: ['people'],
      }),
    )
    .output(preferencesSchema),
  updatePreferences: oc
    .meta(
      openapi({
        method: 'PATCH',
        path: '/me/preferences',
        operationId: 'updateMyPreferences',
        summary: 'Change my preferences',
        description: 'Turn the daily email on or off. People only.',
        tags: ['people'],
      }),
    )
    .input(preferencesSchema)
    .output(preferencesSchema)
    .errors(PEOPLE_ONLY_ERRORS),
  invite: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/workspaces/{workspaceId}/people',
        operationId: 'invitePerson',
        summary: 'Invite a person',
        description: 'Gives access and emails a sign-in link. People only, admins only.',
        tags: ['people'],
      }),
    )
    .input(personInviteInputSchema)
    .output(personSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS, ...MEMBERSHIP_ERRORS }),
  update: oc
    .meta(
      openapi({
        method: 'PATCH',
        path: '/people/{membershipId}',
        operationId: 'updatePerson',
        summary: "Change a person's role, languages or end of access",
        tags: ['people'],
      }),
    )
    .input(personUpdateInputSchema)
    .output(personSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS }),
  remove: oc
    .meta(
      openapi({
        method: 'DELETE',
        path: '/people/{membershipId}',
        operationId: 'removePerson',
        summary: 'Remove a person from the workspace',
        tags: ['people'],
      }),
    )
    .input(membershipRefInputSchema)
    .output(z.object({ removed: z.literal(true) }))
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS }),
}
