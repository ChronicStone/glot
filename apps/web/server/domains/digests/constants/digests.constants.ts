export const DIGEST_SLOT_HOUR_UTC = 7

export const DIGEST_JOB = {
  STUCK_MS: 900_000,
  STUCK_ERROR: 'The server stopped while sending this digest',
} as const

export const DIGEST_LINKS = {
  SETTINGS: '/settings',
} as const
