import { DEFAULT_LOCALE } from '@glot/database/constants/users'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'

export const userAdditionalFields = {
  locale: { type: 'string', input: true, required: false, defaultValue: DEFAULT_LOCALE },
} as const

export const workspaceSchemaMapping = {
  session: { fields: { activeOrganizationId: 'activeWorkspaceId' } },
  member: { fields: { organizationId: 'workspaceId' } },
  invitation: { fields: { organizationId: 'workspaceId' } },
} as const

export const workspaceAccessControl = createAccessControl(defaultStatements)

export const workspaceRoles = {
  [WORKSPACE_ROLES.OWNER]: workspaceAccessControl.newRole(ownerAc.statements),
  [WORKSPACE_ROLES.ADMIN]: workspaceAccessControl.newRole(adminAc.statements),
  [WORKSPACE_ROLES.DEVELOPER]: workspaceAccessControl.newRole(memberAc.statements),
  [WORKSPACE_ROLES.WRITER]: workspaceAccessControl.newRole(memberAc.statements),
  [WORKSPACE_ROLES.REVIEWER]: workspaceAccessControl.newRole(memberAc.statements),
  [WORKSPACE_ROLES.VIEWER]: workspaceAccessControl.newRole(memberAc.statements),
}
