import { MESSAGE_NODE_TYPES, SYNTAXES } from '../constants/syntax.constants.ts'
import type { Syntax } from '../types/checks.types.ts'
import { htmlTagRanges } from './html.utils.ts'
import { parseMessage } from './message.utils.ts'
import { templateTokenRanges } from './template.utils.ts'

const TOKEN_PATTERN = /⟦\s*(\d+)\s*⟧/gu
const BRACKET_PATTERN = /[⟦⟧]/gu
const FALLBACK_PATTERN = /\{[^{}]*\}|@[.:][^\s|]*/gu

function placeholderRanges(message: string) {
  const { problem, forms } = parseMessage(message)

  if (problem !== null) {
    return [...message.matchAll(FALLBACK_PATTERN)].map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
    }))
  }

  return forms.flatMap((form) =>
    form.items.flatMap((item) =>
      item.type !== MESSAGE_NODE_TYPES.TEXT && item.loc
        ? [{ start: item.loc.start.offset, end: item.loc.end.offset }]
        : [],
    ),
  )
}

export function protectMessage(message: string, options: { syntax?: Syntax } = {}) {
  const ranges =
    options.syntax === SYNTAXES.HANDLEBARS_HTML
      ? templateTokenRanges(message)
      : placeholderRanges(message)

  const extra = [
    ...htmlTagRanges(message),
    ...[...message.matchAll(BRACKET_PATTERN)].map((match) => ({
      start: match.index,
      end: match.index + 1,
    })),
  ].filter((range) => !ranges.some((taken) => range.start < taken.end && taken.start < range.end))

  const tokens: string[] = []
  let text = ''
  let at = 0

  for (const range of [...ranges, ...extra].toSorted((a, b) => a.start - b.start)) {
    tokens.push(message.slice(range.start, range.end))
    text += `${message.slice(at, range.start)}⟦${tokens.length}⟧`
    at = range.end
  }

  return { text: text + message.slice(at), tokens }
}

export function restoreMessage(options: { text: string; tokens: string[] }) {
  const counts = new Map<number, number>()

  for (const match of options.text.matchAll(TOKEN_PATTERN)) {
    const id = Number(match[1])

    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const problems: string[] = []

  for (const [index, original] of options.tokens.entries()) {
    const count = counts.get(index + 1) ?? 0

    if (count === 0) {
      problems.push(`⟦${index + 1}⟧ is missing: it stands for ${original}`)
    } else if (count > 1) {
      problems.push(`⟦${index + 1}⟧ appears ${count} times instead of once`)
    }
  }

  for (const id of counts.keys()) {
    if (id < 1 || id > options.tokens.length) {
      problems.push(`⟦${id}⟧ does not exist in the source text`)
    }
  }

  if (options.text.replace(TOKEN_PATTERN, '').match(BRACKET_PATTERN)) {
    problems.push('A ⟦ or ⟧ is left over: a token is broken')
  }

  if (problems.length > 0) {
    return { value: null, problems }
  }

  return {
    value: options.text.replace(
      TOKEN_PATTERN,
      (_match, id: string) => options.tokens[Number(id) - 1] ?? '',
    ),
    problems,
  }
}
