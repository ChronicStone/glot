import { createParser } from '@intlify/message-compiler'
import type { LinkedNode, MessageNode } from '@intlify/message-compiler'
import {
  MESSAGE_NODE_TYPES,
  SYNTAXES,
  SYNTAX_PROBLEMS,
  UNKNOWN_SYNTAX_PROBLEM,
} from '../constants/syntax.constants.ts'
import type { Syntax, TextSegment } from '../types/checks.types.ts'
import { placeholderStandIn } from './stand-in.utils.ts'
import { templateSegments } from './template.utils.ts'

export function parseMessage(message: string) {
  const codes: number[] = []
  const resource = createParser({ onError: (error) => codes.push(error.code) }).parse(message)
  const forms: MessageNode[] = 'cases' in resource.body ? resource.body.cases : [resource.body]

  const [first] = codes

  return {
    problem: first === undefined ? null : (SYNTAX_PROBLEMS[first] ?? UNKNOWN_SYNTAX_PROBLEM),
    forms,
  }
}

function linkedKey(node: LinkedNode['key']) {
  if (node.type === MESSAGE_NODE_TYPES.NAMED) {
    return `{${node.key}}`
  }

  if (node.type === MESSAGE_NODE_TYPES.LIST) {
    return `{${node.index}}`
  }

  if (node.type === MESSAGE_NODE_TYPES.LITERAL) {
    return `{'${node.value}'}`
  }

  return node.value
}

export function placeholdersOf(forms: MessageNode[]) {
  const found = new Set<string>()

  for (const form of forms) {
    for (const item of form.items) {
      if (item.type === MESSAGE_NODE_TYPES.NAMED) {
        found.add(`{${item.key}}`)
      }

      if (item.type === MESSAGE_NODE_TYPES.LIST) {
        found.add(`{${item.index}}`)
      }

      if (item.type === MESSAGE_NODE_TYPES.LINKED) {
        found.add(`@:${linkedKey(item.key)}`)
      }
    }
  }

  return [...found].toSorted()
}

export function plainTextOf(forms: MessageNode[]) {
  return forms
    .flatMap((form) => form.items)
    .map((item) =>
      item.type === MESSAGE_NODE_TYPES.TEXT || item.type === MESSAGE_NODE_TYPES.LITERAL
        ? (item.value ?? '')
        : ' ',
    )
    .join('')
}

function renderedItem(item: MessageNode['items'][number], options: { written: boolean }) {
  if (item.type === MESSAGE_NODE_TYPES.TEXT || item.type === MESSAGE_NODE_TYPES.LITERAL) {
    return item.value ?? ''
  }

  if (item.type === MESSAGE_NODE_TYPES.NAMED) {
    return options.written ? `{${item.key}}` : placeholderStandIn(item.key)
  }

  if (item.type === MESSAGE_NODE_TYPES.LIST) {
    return options.written ? `{${item.index}}` : placeholderStandIn(String(item.index))
  }

  if (item.type === MESSAGE_NODE_TYPES.LINKED) {
    const key = linkedKey(item.key)

    return options.written ? `@:${key}` : placeholderStandIn(key)
  }

  return options.written ? '{}' : placeholderStandIn('')
}

const WORD_EDGE_START = /^[\w:-]/u

const WORD_EDGE_END = /[\w:-]$/u

function touches(item: MessageNode['items'][number] | undefined, edge: RegExp) {
  if (!item) {
    return false
  }

  if (item.type === MESSAGE_NODE_TYPES.TEXT || item.type === MESSAGE_NODE_TYPES.LITERAL) {
    return edge.test(item.value ?? '')
  }

  return true
}

export function gluedLinksOf(form: MessageNode) {
  return form.items.flatMap((item, index) =>
    item.type === MESSAGE_NODE_TYPES.LINKED &&
    (touches(form.items[index - 1], WORD_EDGE_END) ||
      touches(form.items[index + 1], WORD_EDGE_START))
      ? [linkedKey(item.key)]
      : [],
  )
}

export function renderedForms(forms: MessageNode[], options: { written: boolean }) {
  return forms.map((form) => form.items.map((item) => renderedItem(item, options)).join(''))
}

export function messageSegments(message: string, options: { syntax?: Syntax } = {}): TextSegment[] {
  if (options.syntax === SYNTAXES.HANDLEBARS_HTML) {
    return templateSegments(message)
  }

  const { problem, forms } = parseMessage(message)

  if (problem !== null) {
    return [{ placeholder: false, value: message }]
  }

  return forms.flatMap((form, index) => [
    ...(index > 0 ? [{ placeholder: false, value: ' | ' }] : []),
    ...form.items.map((item) => {
      if (item.type === MESSAGE_NODE_TYPES.NAMED) {
        return { placeholder: true, value: item.key }
      }

      if (item.type === MESSAGE_NODE_TYPES.LIST) {
        return { placeholder: true, value: String(item.index) }
      }

      if (item.type === MESSAGE_NODE_TYPES.LINKED) {
        return { placeholder: true, value: `@:${linkedKey(item.key)}` }
      }

      return { placeholder: false, value: item.value ?? '' }
    }),
  ])
}
