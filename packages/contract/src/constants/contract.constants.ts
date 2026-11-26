export const PEOPLE_ONLY_PROCEDURES = {
  APPROVE_TEXT: 'reviews.approve',
} as const

export const NOT_FOUND_ERRORS = { NOT_FOUND: { message: 'Not found' } }

export const PEOPLE_ONLY_ERRORS = {
  PEOPLE_ONLY: { status: 403, message: 'Only a signed-in person can do this' },
}

export const AUTHORIZATION_HEADER = 'authorization'

export const BEARER_PREFIX = 'Bearer '
