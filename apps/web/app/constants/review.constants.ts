import { REVIEW_REASONS } from '@glot/contract'

export const REVIEW_REASON_LABELS = {
  [REVIEW_REASONS.SENT_FOR_REVIEW]: 'Sent for review',
  [REVIEW_REASONS.TO_CHECK]: 'To check',
  [REVIEW_REASONS.SOURCE_CHANGED]: 'Source text changed',
} as const

export const REVIEW_SESSION_PAGE_SIZE = 200

export const REVIEW_SECONDS_PER_TEXT = 25
