import { TEMPLATE_UNMATCHED_PROBLEM } from '../constants/syntax.constants.ts'
import type { TextSegment } from '../types/checks.types.ts'

const TEMPLATE_TOKEN_PATTERN = /\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}|\[\[[\s\S]*?\]\]/gu
const TEMPLATE_LEFTOVER_PATTERN = /\{\{|\}\}|\[\[|\]\]/u
const TEMPLATE_TAG_PATTERN = /<\/?[a-zA-Z][a-zA-Z0-9-]*\b[^<>]*?\/?>/gu

const TEMPLATE_ATTRIBUTE_PATTERN =
  /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gu

const TEMPLATE_HREF_PATTERN = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/giu

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

function normalizedTag(tag: string) {
  const name = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/u.exec(tag)

  const attributes = [...tag.matchAll(TEMPLATE_ATTRIBUTE_PATTERN)]
    .map((match) => `${match[1]?.toLowerCase()}="${match[2] ?? match[3] ?? match[4] ?? ''}"`)
    .toSorted()

  return `<${name?.[1] ?? ''}${name?.[2]?.toLowerCase() ?? ''}${attributes.map((attribute) => ` ${attribute}`).join('')}>`
}

export function templateMarkupOf(message: string) {
  return [...message.matchAll(TEMPLATE_TAG_PATTERN)]
    .map((match) => normalizedTag(match[0]))
    .toSorted()
}

export function templateLinksOf(message: string) {
  return [...message.matchAll(TEMPLATE_HREF_PATTERN)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? '',
  )
}
