import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export const GLOSSARY_ANY_LANGUAGE_ROLES = {
  OWNER: WORKSPACE_ROLES.OWNER,
  ADMIN: WORKSPACE_ROLES.ADMIN,
} as const

export const GLOSSARY_OWN_LANGUAGE_ROLES = {
  REVIEWER: WORKSPACE_ROLES.REVIEWER,
} as const
