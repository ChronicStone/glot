import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export const ROLE_LABELS = {
  [WORKSPACE_ROLES.OWNER]: 'Owner',
  [WORKSPACE_ROLES.ADMIN]: 'Admin',
  [WORKSPACE_ROLES.DEVELOPER]: 'Developer',
  [WORKSPACE_ROLES.WRITER]: 'Writer',
  [WORKSPACE_ROLES.REVIEWER]: 'Reviewer',
  [WORKSPACE_ROLES.VIEWER]: 'Viewer',
} as const

export const SETTINGS_LINKS = {
  PEOPLE: { label: 'People', to: '/settings/people', icon: 'i-lucide-users' },
  PROJECTS: { label: 'Projects', to: '/settings/projects', icon: 'i-lucide-folder-git-2' },
  KEYS: { label: 'API keys', to: '/settings/keys', icon: 'i-lucide-key-round' },
} as const
