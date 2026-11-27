import { PLACEHOLDER_STAND_IN, TEMPLATE_UNMATCHED_PROBLEM } from '../constants/syntax.constants.ts'
import type { TextSegment } from '../types/checks.types.ts'
import { withoutHtmlTags } from './html.utils.ts'

const TEMPLATE_TOKEN_PATTERN = /\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}|\[\[[\s\S]*?\]\]/gu
const TEMPLATE_LEFTOVER_PATTERN = /\{\{|\}\}|\[\[|\]\]/u

function tokenName(token: string) {
  const inner = token.startsWith('{{{') ? token.slice(3, -3) : token.slice(2, -2)

  return inner.trim().replaceAll(/\s+/gu, ' ')
}

function normalizedToken(token: string) {
  const name = tokenName(token)

  if (token.startsWith('{{{')) {
    return `{{{${name}}}}`
  }

  return token.startsWith('[[') ? `[[${name}]]` : `{{${name}}}`
}

export function templateTokenRanges(message: string) {
  return [...message.matchAll(TEMPLATE_TOKEN_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
}

export function templatePlainText(message: string) {
  return withoutHtmlTags(message.replace(TEMPLATE_TOKEN_PATTERN, ' '))
}

export function parseTemplate(message: string) {
  const tokens = [...message.matchAll(TEMPLATE_TOKEN_PATTERN)].map((match) => match[0])
  const rest = message.replace(TEMPLATE_TOKEN_PATTERN, ' ')

  return {
    problem: TEMPLATE_LEFTOVER_PATTERN.test(rest) ? TEMPLATE_UNMATCHED_PROBLEM : null,
    placeholders: [...new Set(tokens.map(normalizedToken))].toSorted(),
  }
}

export function templateSegments(message: string): TextSegment[] {
  const segments: TextSegment[] = []
  let at = 0

  for (const match of message.matchAll(TEMPLATE_TOKEN_PATTERN)) {
    if (match.index > at) {
      segments.push({ placeholder: false, value: message.slice(at, match.index) })
    }

    segments.push({ placeholder: true, value: tokenName(match[0]) })
    at = match.index + match[0].length
  }

  if (at < message.length) {
    segments.push({ placeholder: false, value: message.slice(at) })
  }

  return segments
}

export function templateRendered(message: string) {
  return message.replace(TEMPLATE_TOKEN_PATTERN, PLACEHOLDER_STAND_IN)
}
