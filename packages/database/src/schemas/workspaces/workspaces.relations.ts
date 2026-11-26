import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const workspacesRelationsPart = defineRelationsPart(schema, (r) => ({
  workspaces: {
    memberships: r.many.workspaceMemberships({
      from: r.workspaces.id,
      to: r.workspaceMemberships.workspaceId,
    }),
    invitations: r.many.workspaceInvitations({
      from: r.workspaces.id,
      to: r.workspaceInvitations.workspaceId,
    }),
    projects: r.many.projects({ from: r.workspaces.id, to: r.projects.workspaceId }),
  },
  workspaceMemberships: {
    workspace: r.one.workspaces({
      from: r.workspaceMemberships.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    user: r.one.user({ from: r.workspaceMemberships.userId, to: r.user.id, optional: false }),
  },
  workspaceInvitations: {
    workspace: r.one.workspaces({
      from: r.workspaceInvitations.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    inviter: r.one.user({ from: r.workspaceInvitations.inviterId, to: r.user.id, optional: false }),
  },
}))
