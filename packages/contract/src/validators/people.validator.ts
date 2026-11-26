import { userSelectSchema } from '@glot/database/validators/users'
import {
  workspaceMembershipInsertSchema,
  workspaceMembershipSelectSchema,
  workspaceRoleSchema,
} from '@glot/database/validators/workspaces'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

const languagesSchema = z
  .array(languageCodeSchema)
  .nullable()
  .describe('The languages this person changes. Null means every language.')

export const workspaceRefInputSchema = workspaceMembershipSelectSchema.pick({ workspaceId: true })

export const membershipRefInputSchema = z.object({
  membershipId: workspaceMembershipSelectSchema.shape.id,
})

export const personSchema = workspaceMembershipSelectSchema
  .pick({ id: true, role: true, expiresAt: true })
  .extend({
    languages: languagesSchema,
    user: userSelectSchema.pick({ id: true, name: true, email: true, image: true }),
    signedIn: z.boolean().describe('False until the person opens their first sign-in link.'),
  })

export const accessSchema = personSchema.pick({ role: true, languages: true, expiresAt: true })

const membershipChangesSchema = workspaceMembershipInsertSchema
  .pick({ expiresAt: true })
  .extend({ role: workspaceRoleSchema, languages: languagesSchema })

export const personInviteInputSchema = membershipChangesSchema.extend({
  workspaceId: workspaceMembershipSelectSchema.shape.workspaceId,
  email: z.email(),
  name: userSelectSchema.shape.name.min(1).optional(),
})

export const personUpdateInputSchema = membershipChangesSchema.extend(
  membershipRefInputSchema.shape,
)
