export const JOB_KINDS = {
  RELEASE: 'RELEASE',
  DIGEST: 'DIGEST',
  AI_FILL: 'AI_FILL',
} as const

export const JOB_STATUSES = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const
