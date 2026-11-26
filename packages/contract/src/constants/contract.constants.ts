export const PEOPLE_ONLY_PROCEDURES = {
  APPROVE_TEXT: 'reviews.approve',
  INVITE_PERSON: 'people.invite',
  UPDATE_PERSON: 'people.update',
  REMOVE_PERSON: 'people.remove',
} as const

export const NOT_FOUND_ERRORS = { NOT_FOUND: { message: 'Not found' } }

export const ADMIN_ONLY_ERRORS = { FORBIDDEN: { message: 'Only an admin can do this' } }

export const MEMBERSHIP_ERRORS = {
  CONFLICT: { message: 'This person is already in the workspace' },
}

export const PEOPLE_ONLY_ERRORS = {
  PEOPLE_ONLY: { status: 403, message: 'Only a signed-in person can do this' },
}

export const AUTHORIZATION_HEADER = 'authorization'

export const BEARER_PREFIX = 'Bearer '
