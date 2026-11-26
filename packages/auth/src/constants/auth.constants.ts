export const AUTH_COOKIE_PREFIX = 'glot'

export const MAGIC_LINK_EXPIRES_IN_SECONDS = 600

export const SESSION_EXPIRES_IN_SECONDS = 1_209_600

export const SESSION_UPDATE_AGE_SECONDS = 86_400

export const DATABASE_ID_MODELS = {
  ORGANIZATION: 'organization',
  MEMBER: 'member',
  INVITATION: 'invitation',
} as const

export const ACTOR_KINDS = {
  PERSON: 'person',
  KEY: 'key',
} as const
