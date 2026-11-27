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
  AI: { label: 'AI', to: '/settings/ai', icon: 'i-lucide-sparkle' },
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

export const ROLE_DESCRIPTIONS = {
  [WORKSPACE_ROLES.OWNER]: 'Everything, including the workspace',
  [WORKSPACE_ROLES.ADMIN]: 'People, projects and every language',
  [WORKSPACE_ROLES.DEVELOPER]: 'Links, markup, shared email blocks',
  [WORKSPACE_ROLES.WRITER]: 'Writes French and given languages',
  [WORKSPACE_ROLES.REVIEWER]: 'Writes and approves their languages',
  [WORKSPACE_ROLES.VIEWER]: 'Reads and comments',
} as const

export const ACCESS_ENDS = {
  NONE: { id: 'NONE', months: 0, label: 'No end', icon: 'i-lucide-infinity' },
  ONE_MONTH: { id: 'ONE_MONTH', months: 1, label: 'In 1 month', icon: 'i-lucide-calendar-clock' },
  THREE_MONTHS: {
    id: 'THREE_MONTHS',
    months: 3,
    label: 'In 3 months',
    icon: 'i-lucide-calendar-clock',
  },
  SIX_MONTHS: {
    id: 'SIX_MONTHS',
    months: 6,
    label: 'In 6 months',
    icon: 'i-lucide-calendar-clock',
  },
  ONE_YEAR: { id: 'ONE_YEAR', months: 12, label: 'In a year', icon: 'i-lucide-calendar-clock' },
  DATE: { id: 'DATE', months: 0, label: 'On a date…', icon: 'i-lucide-calendar-days' },
} as const
