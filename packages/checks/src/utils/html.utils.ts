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

const STRAY_MARKUP_PATTERN = /<(?:\/?[a-zA-Z][a-zA-Z0-9-]*|!|\?|\/)[^<>]*/gu

const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/gu

const MARKUP_TOKEN_PATTERN = new RegExp(
  `${HTML_COMMENT_PATTERN.source}|${HTML_TAG_PATTERN.source}`,
  'gu',
)

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

export function strayMarkupOf(message: string) {
  const tags = htmlTagRanges(message)

  return [...message.matchAll(STRAY_MARKUP_PATTERN)].flatMap((match) =>
    tags.some(({ start, end }) => match.index >= start && match.index < end)
      ? []
      : [{ markup: match[0].trim(), closed: message.includes('>', match.index) }],
  )
}

export function htmlCommentsOf(message: string) {
  return [...message.matchAll(MARKUP_TOKEN_PATTERN)].flatMap((match) =>
    match[0].startsWith('<!--') ? [match[0]] : [],
  )
}

export function withoutHtmlComments(message: string) {
  return message.replace(MARKUP_TOKEN_PATTERN, (token) => (token.startsWith('<!--') ? ' ' : token))
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
    [
      ...[...message.matchAll(HTML_TAG_PATTERN)].map((match) => match[0]),
      ...strayMarkupOf(message).map(({ markup }) => markup),
    ].filter((markup) => markup.includes(LINK_MARK)).length
  )
}
