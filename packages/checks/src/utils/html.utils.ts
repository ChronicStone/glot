import {
  ACTIVE_ATTRIBUTES,
  EVENT_ATTRIBUTE_PREFIX,
  HTML_VOID_ELEMENTS,
  LINK_MARK,
  RAW_TEXT_ELEMENTS,
} from '../constants/syntax.constants.ts'
import type { HtmlTag } from '../types/checks.types.ts'

const HTML_TAG_PATTERN =
  /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>/gu

const HTML_ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/gu

const MARKUP_OPENER_PATTERN = /<(?:\/?[a-zA-Z]|!|\?|\/)/uy

const TAG_AT_PATTERN = new RegExp(HTML_TAG_PATTERN.source, 'uy')

const RAW_TEXT = new Set<string>(Object.values(RAW_TEXT_ELEMENTS))

const ABRUPT_COMMENT_PATTERN = /--!>|<!--->|<!-->/u

const COMMENT_DIRECTIVE_PATTERN = /\[[^\]]*\]/gu

const EQUALS_TOKEN_PATTERN = /([A-Za-z0-9_:-]*)\s*=/gu

const LEADING_EQUALS_PATTERN = /^\s*=/u

const ACTIVE = new Set<string>(Object.values(ACTIVE_ATTRIBUTES))

const VOID_ELEMENTS = new Set<string>(Object.values(HTML_VOID_ELEMENTS))

export function htmlTagsOf(message: string): HtmlTag[] {
  return [...message.matchAll(HTML_TAG_PATTERN)].map((match) => ({
    closing: match[1] === '/',
    name: match[2]?.toLowerCase() ?? '',
    selfClosing: match[4] === '/' && !VOID_ELEMENTS.has(match[2]?.toLowerCase() ?? ''),
    attributes: [...(match[3] ?? '').matchAll(HTML_ATTRIBUTE_PATTERN)].map((attribute) => ({
      name: attribute[1]?.toLowerCase() ?? '',
      value: attribute[2] ?? attribute[3] ?? attribute[4] ?? '',
    })),
  }))
}

export function htmlMarkupOf(message: string, options: { freeValues: readonly string[] }) {
  return htmlTagsOf(message)
    .map((tag) => {
      const attributes = tag.attributes
        .map(({ name, value }) => (options.freeValues.includes(name) ? name : `${name}="${value}"`))
        .toSorted()

      return `<${tag.closing ? '/' : ''}${tag.name}${attributes.map((attribute) => ` ${attribute}`).join('')}${tag.selfClosing ? '/' : ''}>`
    })
    .toSorted()
}

export function htmlLinksOf(message: string) {
  return htmlTagsOf(message).flatMap((tag) =>
    tag.attributes.flatMap(({ name, value }) => (name === 'href' ? [value] : [])),
  )
}

export function htmlTagsNest(message: string) {
  const open: string[] = []

  for (const tag of htmlTagsOf(message)) {
    if (tag.selfClosing || VOID_ELEMENTS.has(tag.name)) {
      continue
    }

    if (!tag.closing) {
      open.push(tag.name)
    } else if (open.pop() !== tag.name) {
      return false
    }
  }

  return open.length === 0
}

export function withoutHtmlTags(message: string) {
  return message.replace(HTML_TAG_PATTERN, ' ')
}

export function htmlTagRanges(message: string) {
  return [...message.matchAll(HTML_TAG_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
}

function markupTokensOf(message: string) {
  const tokens: Array<{
    kind: 'tag' | 'comment' | 'stray'
    text: string
    closed: boolean
    start: number
    end: number
  }> = []

  let at = message.indexOf('<')

  while (at !== -1) {
    const commentEnd = message.startsWith('<!--', at) ? message.indexOf('-->', at + 4) : -1

    TAG_AT_PATTERN.lastIndex = at
    MARKUP_OPENER_PATTERN.lastIndex = at

    const tag = commentEnd === -1 ? TAG_AT_PATTERN.exec(message) : null
    const opener = commentEnd === -1 && !tag && MARKUP_OPENER_PATTERN.test(message)
    const close = message.indexOf('>', at)

    const end =
      commentEnd !== -1
        ? commentEnd + 3
        : tag
          ? at + tag[0].length
          : opener
            ? close === -1
              ? message.length
              : close + 1
            : at + 1

    if (commentEnd !== -1 || tag || opener) {
      tokens.push({
        kind: commentEnd !== -1 ? 'comment' : tag ? 'tag' : 'stray',
        text: message.slice(at, end),
        closed: commentEnd !== -1 || Boolean(tag) || close !== -1,
        start: at,
        end,
      })
    }

    at = message.indexOf('<', end)
  }

  return tokens
}

export function strayMarkupOf(message: string) {
  return markupTokensOf(message).flatMap(({ kind, text, closed }) =>
    kind === 'stray' ? [{ markup: text.trim(), closed }] : [],
  )
}

export function htmlCommentsOf(message: string) {
  return markupTokensOf(message).flatMap(({ kind, text }) => (kind === 'comment' ? [text] : []))
}

export function withoutHtmlComments(message: string) {
  return markupTokensOf(message)
    .filter(({ kind }) => kind === 'comment')
    .toReversed()
    .reduce((rest, { start, end }) => `${rest.slice(0, start)} ${rest.slice(end)}`, message)
}

export function rawTextElementsOf(message: string) {
  return htmlTagsOf(withoutHtmlComments(message)).flatMap(({ name }) =>
    RAW_TEXT.has(name) ? [name] : [],
  )
}

export function equalsTokensOf(message: string) {
  return [...withoutHtmlTags(message).matchAll(EQUALS_TOKEN_PATTERN)].map(
    (match) => match[1]?.toLowerCase() ?? '',
  )
}

export function bareClosersOf(message: string) {
  return withoutHtmlTags(message).split('>').length - 1
}

export function hasAbruptComment(message: string) {
  return ABRUPT_COMMENT_PATTERN.test(message)
}

export function commentMarkupOf(comment: string) {
  const inner = comment.slice(4, -3)

  return [
    ...[...inner.matchAll(HTML_TAG_PATTERN)].map((match) => match[0]),
    ...(inner.match(COMMENT_DIRECTIVE_PATTERN) ?? []),
    ...strayMarkupOf(inner).map(({ markup }) => markup),
  ].join('')
}

export function isActiveAttribute(name: string) {
  return ACTIVE.has(name) || (name.startsWith(EVENT_ATTRIBUTE_PREFIX) && name.length > 2)
}

export function startsWithEquals(message: string) {
  return LEADING_EQUALS_PATTERN.test(message)
}

export function markedFreeValuesOf(message: string, options: { freeValues: readonly string[] }) {
  return htmlTagsOf(message).flatMap((tag) =>
    tag.attributes.flatMap(({ name, value }) =>
      options.freeValues.includes(name) && /[<>]/u.test(value) ? [value] : [],
    ),
  )
}

export function linksInsideTags(message: string) {
  const opened = message.split(`<${LINK_MARK}`).length + message.split(`</${LINK_MARK}`).length - 2

  return (
    opened +
    markupTokensOf(message).filter(
      ({ kind, text }) => kind !== 'comment' && text.includes(LINK_MARK),
    ).length
  )
}

export function linksInsideComments(message: string) {
  return markupTokensOf(message).filter(
    ({ kind, text }) => kind === 'comment' && text.includes(LINK_MARK),
  ).length
}
