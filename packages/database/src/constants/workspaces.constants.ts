export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  WRITER: 'writer',
  REVIEWER: 'reviewer',
  VIEWER: 'viewer',
} as const

export const WORKSPACE_INVITATION_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
} as const
