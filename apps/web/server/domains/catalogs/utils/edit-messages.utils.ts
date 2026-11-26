import { applyEdits, modify, parseTree } from 'jsonc-parser'
import type { JSONPath, Node } from 'jsonc-parser'
import { MESSAGE_FILE } from '../constants/catalog.constants.ts'
import type { MessageEdit } from '../types/catalog.types.ts'

function childOf(options: { node: Node | undefined; segment: string }) {
  const { node, segment } = options

  if (node?.type === 'array') {
    return node.children?.[Number(segment)]
  }

  return node?.type === 'object'
    ? node.children?.find((property) => property.children?.[0]?.value === segment)?.children?.[1]
    : undefined
}

function locate(options: { root: Node | undefined; path: string[] }) {
  const segments: JSONPath = []
  let node = options.root

  for (const segment of options.path) {
    segments.push(node?.type === 'array' ? Number(segment) : segment)
    node = childOf({ node, segment })
  }

  return { segments, node }
}

function formattingOf(content: string) {
  const indent = /^([ \t]+)\S/mu.exec(content)?.[1] ?? ' '.repeat(MESSAGE_FILE.INDENT)

  return {
    insertSpaces: !indent.startsWith('\t'),
    tabSize: indent.startsWith('\t') ? 1 : indent.length,
    eol: content.includes('\r\n') ? '\r\n' : '\n',
  }
}

function editOne(options: { content: string; edit: MessageEdit }) {
  const { content, edit } = options
  const { segments, node } = locate({ root: parseTree(content), path: edit.path })

  if (node) {
    return applyEdits(content, [
      { offset: node.offset, length: node.length, content: JSON.stringify(edit.value) },
    ])
  }

  return applyEdits(
    content,
    modify(content, segments, edit.value, { formattingOptions: formattingOf(content) }),
  )
}

export function editMessages(options: { content: string; edits: MessageEdit[] }) {
  const hasBom = options.content.startsWith(MESSAGE_FILE.BOM)
  const body = hasBom ? options.content.slice(MESSAGE_FILE.BOM.length) : options.content

  const edited = options.edits.reduce((content, edit) => editOne({ content, edit }), body)

  return hasBom ? `${MESSAGE_FILE.BOM}${edited}` : edited
}
