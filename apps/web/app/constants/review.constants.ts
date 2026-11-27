import { CHECK_CODES } from '@glot/checks'
import { CONFLICT_REASONS, REVIEW_REASONS } from '@glot/contract'

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
  [CHECK_CODES.MARKUP]: 'Markup and links',
  [CHECK_CODES.LINKS]: 'Links',
  [CHECK_CODES.AVOID_WORDS]: 'Glossary',
  [CHECK_CODES.NEVER_TRANSLATE]: 'Never translated',
} as const

export const SESSION_OUTCOMES = {
  APPROVED: 'ok',
  EDITED: 'edit',
  SKIPPED: 'skip',
} as const

export const CONFLICT_REASON_LABELS = {
  [CONFLICT_REASONS.SOURCE_CHANGED]: 'The French changed after this was approved',
  [CONFLICT_REASONS.TARGET_CHANGED]: 'The text changed in the repository after this was approved',
  [CONFLICT_REASONS.TEXT_REMOVED]: 'The text is gone from the repository',
} as const

export const TIMELINE_HOURS = {
  BEFORE: 11,
  AFTER: 1,
} as const
