export const SETUP_LINK_EXPIRES_IN_SECONDS = 86_400

export const SETUP_IDENTIFIER_PREFIX = 'setup:'

export const SETUP_VERIFICATION_VALUE = 'setup'

export const SETUP_PROVISIONING_SOURCE = { method: 'setup' } as const

export const SETUP_PAGE_PATH = '/setup'

export const SETUP_TOKEN_PARAMETER = 'token'

export const SETUP_RATE_LIMIT = { WINDOW_SECONDS: 60, MAX_REQUESTS: 10 } as const

export const SETUP_ERRORS = {
  INVALID_LINK: {
    code: 'INVALID_SETUP_LINK',
    message: 'This setup link is not valid anymore.',
  },
} as const
