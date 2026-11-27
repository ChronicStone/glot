import { AI_PROVIDERS, AI_USAGE_KINDS } from '@glot/database/constants/ai'

export const AI_PROVIDER_LABELS = {
  [AI_PROVIDERS.ANTHROPIC]: 'Anthropic',
  [AI_PROVIDERS.OPENAI]: 'OpenAI',
} as const

export const AI_USAGE_KIND_LABELS = {
  [AI_USAGE_KINDS.FILL]: 'Fills of missing texts',
  [AI_USAGE_KINDS.SUGGEST]: 'Suggestions on one text',
} as const

export const AI_USAGE_KIND_COLORS = {
  [AI_USAGE_KINDS.FILL]: 'var(--glot-d-violet)',
  [AI_USAGE_KINDS.SUGGEST]: 'var(--glot-d-blue)',
} as const

export const AI_BUDGET = {
  WARN_RATIO: 0.8,
  ALERT_RATIO: 0.9,
} as const
