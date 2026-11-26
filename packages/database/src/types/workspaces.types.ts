import type { ValueOf } from '@glot/utils/types'
import type {
  WORKSPACE_INVITATION_STATUSES,
  WORKSPACE_ROLES,
} from '../constants/workspaces.constants.ts'
import type {
  workspaceInvitations,
  workspaceMemberships,
  workspaces,
} from '../schemas/workspaces/workspaces.schema.ts'

export type Workspace = typeof workspaces.$inferSelect

export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect

export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect

export type WorkspaceRole = ValueOf<typeof WORKSPACE_ROLES>

export type WorkspaceInvitationStatus = ValueOf<typeof WORKSPACE_INVITATION_STATUSES>
