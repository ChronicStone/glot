import type * as z from 'zod'
import type {
  accessSchema,
  membershipRefInputSchema,
  personInviteInputSchema,
  personSchema,
  personUpdateInputSchema,
  preferencesSchema,
  workspaceRefInputSchema,
  workspaceSchema,
  workspaceUpdateInputSchema,
} from '../validators/people.validator.ts'

export type WorkspaceRefInput = z.infer<typeof workspaceRefInputSchema>

export type MembershipRefInput = z.infer<typeof membershipRefInputSchema>

export type Person = z.infer<typeof personSchema>

export type Access = z.infer<typeof accessSchema>

export type PersonInviteInput = z.infer<typeof personInviteInputSchema>

export type PersonUpdateInput = z.infer<typeof personUpdateInputSchema>

export type Preferences = z.infer<typeof preferencesSchema>

export type Workspace = z.infer<typeof workspaceSchema>

export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateInputSchema>
