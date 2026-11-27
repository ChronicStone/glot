import { HTML_VOID_ELEMENTS } from '../constants/syntax.constants.ts'
import type { HtmlTag } from '../types/checks.types.ts'

const HTML_TAG_PATTERN =
  /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>/gu

const HTML_ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/gu

const STRAY_MARKUP_PATTERN = /<(?:\/?[a-zA-Z]|!|\?|\/)/gu

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
  return [...withoutHtmlTags(message).matchAll(STRAY_MARKUP_PATTERN)].map((match) => match[0])
}
