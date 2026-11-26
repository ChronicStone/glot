import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export const PEOPLE_MANAGER_ROLES = {
  OWNER: WORKSPACE_ROLES.OWNER,
  ADMIN: WORKSPACE_ROLES.ADMIN,
} as const

export const INVITATION_CALLBACK_PATH = '/'

export const INVITATION_PROVISIONING_SOURCE = { method: 'invitation' } as const
