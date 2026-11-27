import type { AiProvider } from '@glot/database/types/ai'
import {
  AI_FALLBACK_PRICES_PER_MILLION,
  AI_MICROS_PER_USD,
  AI_PRICES_PER_MILLION,
} from '../constants/ai.constants.ts'

export function costMicros(options: {
  provider: AiProvider
  model: string
  inputTokens: number
  outputTokens: number
}) {
  const known: Record<string, { INPUT: number; OUTPUT: number }> = AI_PRICES_PER_MILLION
  const price = known[options.model] ?? AI_FALLBACK_PRICES_PER_MILLION[options.provider]

  return Math.round(options.inputTokens * price.INPUT + options.outputTokens * price.OUTPUT)
}

export function usdOf(micros: number) {
  return micros / AI_MICROS_PER_USD
}

export function microsOf(usd: number) {
  return Math.round(usd * AI_MICROS_PER_USD)
}

export function monthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function monthEnd(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export function monthKey(now: Date) {
  return now.toISOString().slice(0, 7)
}

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function monthDays(now: Date) {
  const start = monthStart(now)

  return Array.from({ length: now.getUTCDate() }, (_, index) =>
    dayKey(new Date(start.getTime() + index * 86_400_000)),
  )
}
