export const NEEDS_FILTERS = {
  ALL: 'all',
  FIXES: 'fixes',
  REVIEWS: 'reviews',
  DRAFTS: 'drafts',
} as const

export const NEEDS_FILTER_LABELS = {
  [NEEDS_FILTERS.ALL]: 'All',
  [NEEDS_FILTERS.FIXES]: 'Fixes',
  [NEEDS_FILTERS.REVIEWS]: 'Reviews',
  [NEEDS_FILTERS.DRAFTS]: 'Drafts',
} as const
