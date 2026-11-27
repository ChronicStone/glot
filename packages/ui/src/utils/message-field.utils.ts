import { SYNTAXES, messageSegments } from '@glot/checks'
import type { Syntax } from '@glot/checks'
import type { FieldPart } from '../types/message-field.types.ts'
import {
  HTML_TAG_LABELS,
  HTML_TAG_PATTERN,
  TEMPLATE_TOKEN_CLOSERS,
} from '../constants/ui.constants.ts'

function templateToken(options: { value: string; at: number; name: string }) {
  const opener = Object.keys(TEMPLATE_TOKEN_CLOSERS).find((candidate) =>
    options.value.startsWith(candidate, options.at),
  )

  if (!opener) {
    return `{{${options.name}}}`
  }

  const closer = TEMPLATE_TOKEN_CLOSERS[opener as keyof typeof TEMPLATE_TOKEN_CLOSERS]
  const end = options.value.indexOf(closer, options.at + opener.length)

  return end === -1
    ? options.value.slice(options.at)
    : options.value.slice(options.at, end + closer.length)
}

function tagLabel(tag: string) {
  const name = /^<\/?([a-zA-Z0-9-]+)/u.exec(tag)?.[1]?.toLowerCase() ?? ''

  const label = new Map<string, string>(Object.entries(HTML_TAG_LABELS)).get(name) ?? name

  return tag.startsWith('</') ? `end of ${label}` : label
}

function tagParts(text: string): FieldPart[] {
  return text
    .split(HTML_TAG_PATTERN)
    .filter(Boolean)
    .map((piece) =>
      HTML_TAG_PATTERN.test(piece)
        ? { locked: true, label: tagLabel(piece), raw: piece }
        : { locked: false, label: piece, raw: piece },
    )
}

export function fieldParts(value: string, syntax: Syntax | undefined): FieldPart[] {
  const segments = messageSegments(value, syntax ? { syntax } : {})

  if (syntax !== SYNTAXES.HANDLEBARS_HTML) {
    return segments.map((segment) => ({
      locked: segment.placeholder,
      label: segment.value,
      raw:
        segment.placeholder && !segment.value.startsWith('@:')
          ? `{${segment.value}}`
          : segment.value,
    }))
  }

  let at = 0

  return segments.flatMap((segment) => {
    if (!segment.placeholder) {
      at += segment.value.length

      return tagParts(segment.value)
    }

    const raw = templateToken({ value, at, name: segment.value })

    at += raw.length

    return [{ locked: true, label: segment.value, raw }]
  })
}

export function serializeField(root: Node): string {
  return [...root.childNodes]
    .map((child) => {
      if (child instanceof HTMLElement && child.dataset.raw !== undefined) {
        return child.dataset.raw
      }

      if (child instanceof HTMLBRElement) {
        return '\n'
      }

      return child instanceof HTMLElement ? serializeField(child) : (child.textContent ?? '')
    })
    .join('')
}
