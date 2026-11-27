import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export const RELEASE_BRANCH = 'glot/release'

export const RELEASE_ROLES = {
  OWNER: WORKSPACE_ROLES.OWNER,
  ADMIN: WORKSPACE_ROLES.ADMIN,
  DEVELOPER: WORKSPACE_ROLES.DEVELOPER,
} as const

export const RELEASE_SLOT_HOURS_UTC = {
  MORNING: 8,
  AFTERNOON: 14,
} as const

export const RELEASE_CLOCK = {
  TICK_MS: 60_000,
  STUCK_JOB_MS: 900_000,
} as const

export const RELEASE_TITLE = 'Release translations'

export const RELEASE_NEXT_ITEMS = 3
