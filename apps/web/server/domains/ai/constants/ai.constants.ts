import { AI_PROVIDERS } from '@glot/database/constants/ai'

export const AI_DEFAULT_BASE_URLS = {
  [AI_PROVIDERS.ANTHROPIC]: 'https://api.anthropic.com',
  [AI_PROVIDERS.OPENAI]: 'https://api.openai.com',
} as const

export const AI_ANTHROPIC_VERSION = '2023-06-01'

export const AI_ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  IV_BYTES: 12,
  SALT: 'glot-ai-keys-salt',
  INFO: 'glot-ai-keys',
  KEY_BYTES: 32,
  VERSION: 'v1',
} as const

export const AI_STOPS = {
  REFUSED: 'REFUSED',
  CUT_SHORT: 'CUT_SHORT',
} as const

export const AI_STOP_MESSAGES = {
  [AI_STOPS.REFUSED]: 'The AI provider declined to answer',
  [AI_STOPS.CUT_SHORT]: 'The AI answer was cut short',
} as const

export const AI_FILL_CLOCK = {
  TICK_MS: 5_000,
} as const

export const AI_HTTP = {
  ATTEMPTS: 3,
  TIMEOUT_MS: 180_000,
  DEFAULT_DELAY_MS: 1000,
  MAX_DELAY_MS: 20_000,
} as const

export const AI_BATCH = {
  SIZE: 20,
  CONCURRENCY: 2,
  MAX_OUTPUT_TOKENS: 16_000,
  RETRIES: 1,
  MAX_REASON_LENGTH: 200,
  MAX_REFERENCE_LANGUAGES: 4,
} as const

export const AI_FILL_JOB = {
  STUCK_MS: 3_600_000,
  STUCK_ERROR: 'The server stopped during this fill',
  LATEST_FILLS: 20,
} as const

export const AI_PRICES_PER_MILLION = {
  'claude-sonnet-5-5': { INPUT: 2, OUTPUT: 10 },
  'claude-sonnet-5': { INPUT: 2, OUTPUT: 10 },
  'claude-sonnet-4-6': { INPUT: 3, OUTPUT: 15 },
  'claude-opus-5-5': { INPUT: 4, OUTPUT: 20 },
  'claude-opus-5': { INPUT: 5, OUTPUT: 25 },
  'claude-opus-4-8': { INPUT: 5, OUTPUT: 25 },
  'claude-haiku-5-5': { INPUT: 0.5, OUTPUT: 2.5 },
  'claude-haiku-4-5': { INPUT: 1, OUTPUT: 5 },
  'claude-fable-5-2': { INPUT: 8, OUTPUT: 40 },
  'gpt-6.2-sol': { INPUT: 2, OUTPUT: 10 },
  'gpt-6.2-astra': { INPUT: 8, OUTPUT: 40 },
  'gpt-6.1-sol': { INPUT: 2, OUTPUT: 10 },
  'gpt-6.1-terra': { INPUT: 1, OUTPUT: 5 },
  'gpt-6-luna': { INPUT: 0.1, OUTPUT: 0.5 },
  'gpt-5.5': { INPUT: 5, OUTPUT: 30 },
  'gpt-5.4': { INPUT: 2.5, OUTPUT: 15 },
  'gpt-5.4-mini': { INPUT: 0.75, OUTPUT: 4.5 },
} as const

export const AI_FALLBACK_PRICES_PER_MILLION = {
  [AI_PROVIDERS.ANTHROPIC]: { INPUT: 8, OUTPUT: 40 },
  [AI_PROVIDERS.OPENAI]: { INPUT: 10, OUTPUT: 50 },
} as const

export const AI_FILL_REASON_MESSAGES = {
  BUDGET_REACHED: 'The monthly AI budget was reached before every text was written',
  NO_KEY: 'No key is stored for the provider',
  PROVIDER_ERROR: 'The AI provider could not answer',
  TEXTS_REJECTED: 'Some texts were left out because the answer broke a placeholder or a check',
} as const

export const AI_MICROS_PER_USD = 1_000_000
