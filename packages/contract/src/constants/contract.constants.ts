export const PEOPLE_ONLY_PROCEDURES = {
  APPROVE_TEXT: 'reviews.approve',
  EDIT_AND_APPROVE_TEXT: 'reviews.editAndApprove',
  APPROVE_SAME_TEXTS: 'reviews.approveSame',
  REQUEST_CHANGE: 'reviews.requestChange',
  RELEASE_NOW: 'releases.run',
  UNDO_RELEASED_CHANGE: 'releases.undo',
  RESOLVE_CONFLICT: 'releases.resolveConflict',
  UPDATE_GLOSSARY_CONCEPT: 'glossary.updateConcept',
  SET_GLOSSARY_STATUS: 'glossary.setConceptStatus',
  REMOVE_GLOSSARY_CONCEPT: 'glossary.removeConcept',
  CREATE_PROJECT: 'projects.create',
  UPDATE_PROJECT: 'projects.update',
  INVITE_PERSON: 'people.invite',
  UPDATE_PERSON: 'people.update',
  REMOVE_PERSON: 'people.remove',
  UPDATE_MY_PREFERENCES: 'people.updatePreferences',
  UPDATE_WORKSPACE: 'people.updateWorkspace',
  ISSUE_WIDGET_TOKEN: 'widget.token',
  UPDATE_AI_SETTINGS: 'ai.updateSettings',
  SET_AI_KEY: 'ai.setKey',
  REMOVE_AI_KEY: 'ai.removeKey',
  SEND_TEST_EMAIL: 'templates.sendTest',
} as const

export const NOT_FOUND_ERRORS = { NOT_FOUND: { message: 'Not found' } }

export const REVIEW_REASONS = {
  SENT_FOR_REVIEW: 'SENT_FOR_REVIEW',
  TO_CHECK: 'TO_CHECK',
  SOURCE_CHANGED: 'SOURCE_CHANGED',
} as const

export const CONFLICT_REASONS = {
  SOURCE_CHANGED: 'SOURCE_CHANGED',
  TARGET_CHANGED: 'TARGET_CHANGED',
  TEXT_REMOVED: 'TEXT_REMOVED',
} as const

export const CONFLICT_RESOLUTIONS = {
  KEEP: 'KEEP',
  LEAVE_OUT: 'LEAVE_OUT',
} as const

export const LANGUAGE_RIGHTS_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: { message: 'You do not work on this language' },
  CONFLICT: { message: 'This cannot be done in its current state' },
}

export const RELEASE_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: { message: 'Only an owner, an admin or a developer can release' },
  CONFLICT: { message: 'This cannot be done in its current state' },
}

export const GLOSSARY_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: {
    message: 'Only an owner, an admin or a reviewer of the languages involved changes the glossary',
  },
  CONFLICT: { message: 'A concept with this name already exists' },
}

export const AI_FILL_STATUSES = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
} as const

export const AI_SETUP_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: { message: 'Only an owner or an admin sets up AI' },
}

export const AI_ERRORS = {
  ...LANGUAGE_RIGHTS_ERRORS,
  CONFLICT: {
    message:
      'AI cannot run now: there is no key, the monthly budget is reached, or nothing is missing',
  },
  BAD_GATEWAY: { message: 'The AI provider could not answer' },
  UNPROCESSABLE_CONTENT: { message: 'The AI answer broke a placeholder and was refused' },
}

export const WIDGET_ERRORS = {
  ...NOT_FOUND_ERRORS,
  FORBIDDEN: { message: 'This app cannot sign in to Glot from here' },
}

export const TEMPLATE_KINDS = {
  EMAIL: 'email',
  DOCUMENT: 'document',
  SMS: 'sms',
} as const

export const TEMPLATE_ERRORS = {
  ...NOT_FOUND_ERRORS,
  CONFLICT: {
    message: 'This project has no preview adapter: set its address in the project settings',
  },
  BAD_GATEWAY: { message: 'The preview adapter is not answering' },
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
