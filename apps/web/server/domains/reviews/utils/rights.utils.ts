import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import type { WorkspaceRole } from '@glot/database/types/workspaces'

const WRITE_ANY_LANGUAGE: WorkspaceRole[] = [
  WORKSPACE_ROLES.OWNER,
  WORKSPACE_ROLES.ADMIN,
  WORKSPACE_ROLES.DEVELOPER,
]

const WRITE_OWN_LANGUAGES: WorkspaceRole[] = [WORKSPACE_ROLES.WRITER, WORKSPACE_ROLES.REVIEWER]

const APPROVE_ANY_LANGUAGE: WorkspaceRole[] = [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN]

export function writableLanguages(options: {
  role: WorkspaceRole
  languages: string[] | null
  targets: string[]
}) {
  if (WRITE_ANY_LANGUAGE.includes(options.role)) {
    return options.targets
  }

  return WRITE_OWN_LANGUAGES.includes(options.role)
    ? options.targets.filter((language) => options.languages?.includes(language))
    : []
}

export function approvableLanguages(options: {
  role: WorkspaceRole
  languages: string[] | null
  targets: string[]
}) {
  if (APPROVE_ANY_LANGUAGE.includes(options.role)) {
    return options.targets
  }

  return options.role === WORKSPACE_ROLES.REVIEWER
    ? options.targets.filter((language) => options.languages?.includes(language))
    : []
}
