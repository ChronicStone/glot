export const AUTH_COOKIE_PREFIX = 'glot'

export const MAGIC_LINK_EXPIRES_IN_SECONDS = 600

export const SESSION_EXPIRES_IN_SECONDS = 1_209_600

export const SESSION_UPDATE_AGE_SECONDS = 86_400

export const DATABASE_ID_MODELS = {
  ORGANIZATION: 'organization',
  MEMBER: 'member',
  INVITATION: 'invitation',
} as const

export const API_KEY_RATE_LIMIT = {
  WINDOW_MILLISECONDS: 60_000,
  MAX_REQUESTS: 600,
} as const

export const ACTOR_KINDS = {
  PERSON: 'person',
  KEY: 'key',
} as const

export const REPLACED_WORKSPACE_PATHS = {
  ACCEPT_INVITATION: '/organization/accept-invitation',
  ADD_TEAM_MEMBER: '/organization/add-team-member',
  CANCEL_INVITATION: '/organization/cancel-invitation',
  CREATE_ROLE: '/organization/create-role',
  CREATE_TEAM: '/organization/create-team',
  DELETE: '/organization/delete',
  DELETE_ROLE: '/organization/delete-role',
  GET_ACTIVE_MEMBER: '/organization/get-active-member',
  GET_ACTIVE_MEMBER_ROLE: '/organization/get-active-member-role',
  GET_FULL_ORGANIZATION: '/organization/get-full-organization',
  GET_INVITATION: '/organization/get-invitation',
  GET_ORGANIZATION: '/organization/get-organization',
  GET_ROLE: '/organization/get-role',
  HAS_PERMISSION: '/organization/has-permission',
  INVITE_MEMBER: '/organization/invite-member',
  LEAVE: '/organization/leave',
  LIST_INVITATIONS: '/organization/list-invitations',
  LIST_MEMBERS: '/organization/list-members',
  LIST_ROLES: '/organization/list-roles',
  LIST_TEAM_MEMBERS: '/organization/list-team-members',
  LIST_TEAMS: '/organization/list-teams',
  LIST_USER_INVITATIONS: '/organization/list-user-invitations',
  LIST_USER_TEAMS: '/organization/list-user-teams',
  REJECT_INVITATION: '/organization/reject-invitation',
  REMOVE_MEMBER: '/organization/remove-member',
  REMOVE_TEAM: '/organization/remove-team',
  REMOVE_TEAM_MEMBER: '/organization/remove-team-member',
  SET_ACTIVE_TEAM: '/organization/set-active-team',
  UPDATE: '/organization/update',
  UPDATE_MEMBER_ROLE: '/organization/update-member-role',
  UPDATE_ROLE: '/organization/update-role',
  UPDATE_TEAM: '/organization/update-team',
} as const
