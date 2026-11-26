export const CATALOG_CACHE = {
  HEAD_TTL_MS: 60_000,
  MAX_CATALOGS: 16,
} as const

export const GLOT_REPOSITORY = {
  REVIEWS_DIRECTORY: '.glot/reviews',
  REVIEWS_EXTENSION: '.jsonl',
} as const

export const MESSAGE_FILE = {
  BOM: '\uFEFF',
  EMPTY: '{}\n',
  INDENT: 2,
} as const

export const GIT_IDENTITY = {
  NAME: 'Glot',
  EMAIL: 'glot@localhost',
} as const

export const GITHUB_API = {
  URL: 'https://api.github.com',
  VERSION: '2022-11-28',
  USER_AGENT: 'glot',
  MEDIA_TYPE: 'application/vnd.github+json',
  RAW_MEDIA_TYPE: 'application/vnd.github.raw+json',
} as const
