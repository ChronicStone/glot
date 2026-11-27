import { CHECK_CODES } from '@glot/checks'
import { REVIEW_REASONS } from '@glot/contract'

export const REVIEW_REASON_LABELS = {
  [REVIEW_REASONS.SENT_FOR_REVIEW]: 'Sent for review',
  [REVIEW_REASONS.TO_CHECK]: 'To check',
  [REVIEW_REASONS.SOURCE_CHANGED]: 'Source text changed',
} as const

export const REVIEW_SESSION_PAGE_SIZE = 200

export const REVIEW_SECONDS_PER_TEXT = 25

export const CHECK_LABELS = {
  [CHECK_CODES.SYNTAX]: 'Syntax',
  [CHECK_CODES.PLACEHOLDERS]: 'Placeholders',
  [CHECK_CODES.PLURAL_FORMS]: 'Plural forms',
  [CHECK_CODES.HTML_TAGS]: 'HTML tags',
  [CHECK_CODES.AVOID_WORDS]: 'Glossary',
  [CHECK_CODES.NEVER_TRANSLATE]: 'Never translated',
} as const

export const SESSION_OUTCOMES = {
  APPROVED: 'ok',
  EDITED: 'edit',
  SKIPPED: 'skip',
} as const
