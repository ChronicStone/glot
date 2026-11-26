import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export const userAdditionalFields = {
  locale: { type: 'string', input: true, required: false, defaultValue: 'en' },
} as const

export const workspaceSchemaMapping = {
  session: { fields: { activeOrganizationId: 'activeWorkspaceId' } },
  member: { fields: { organizationId: 'workspaceId' } },
  invitation: { fields: { organizationId: 'workspaceId' } },
} as const

export const workspaceCreatorRole = WORKSPACE_ROLES.OWNER
