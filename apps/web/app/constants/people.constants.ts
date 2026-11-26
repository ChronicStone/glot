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

export const AVATAR_COLORS = {
  BLUE: '#5b7fd6',
  CLAY: '#c0794b',
  SAGE: '#4f9a82',
  VIOLET: '#8c6bd0',
  ROSE: '#d06b93',
  SKY: '#5e94b8',
  SLATE: '#8a94a6',
} as const
