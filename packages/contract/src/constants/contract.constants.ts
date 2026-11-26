export const PEOPLE_ONLY_PROCEDURES = {
  APPROVE_TEXT: 'reviews.approve',
  EDIT_AND_APPROVE_TEXT: 'reviews.editAndApprove',
  APPROVE_SAME_TEXTS: 'reviews.approveSame',
  REQUEST_CHANGE: 'reviews.requestChange',
  INVITE_PERSON: 'people.invite',
  UPDATE_PERSON: 'people.update',
  REMOVE_PERSON: 'people.remove',
} as const

export const NOT_FOUND_ERRORS = { NOT_FOUND: { message: 'Not found' } }

export const REVIEW_REASONS = {
  SENT_FOR_REVIEW: 'SENT_FOR_REVIEW',
  TO_CHECK: 'TO_CHECK',
  SOURCE_CHANGED: 'SOURCE_CHANGED',
} as const

export const LANGUAGE_RIGHTS_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: { message: 'You do not work on this language' },
  CONFLICT: { message: 'This cannot be done in its current state' },
}

export const ADMIN_ONLY_ERRORS = { FORBIDDEN: { message: 'Only an admin can do this' } }

export const PROJECT_ERRORS = { CONFLICT: { message: 'This repository is already a project' } }

export const MEMBERSHIP_ERRORS = {
  CONFLICT: { message: 'This person is already in the workspace' },
}

export const PEOPLE_ONLY_ERRORS = {
  PEOPLE_ONLY: { status: 403, message: 'Only a signed-in person can do this' },
}

export const AUTHORIZATION_HEADER = 'authorization'

export const BEARER_PREFIX = 'Bearer '
