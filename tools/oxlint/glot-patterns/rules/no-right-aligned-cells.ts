import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import { isEntityOwnerFile, isRuntimeOwnerFile } from '../shared/paths.ts'

const rightAlignedClassPattern =
  /(?:^|[\s:])(?:text-right|text-end|justify-end|justify-self-end)(?=\s|$)/u

function propertyName(node: ESTree.Property) {
  if (node.key.type === 'Identifier') return node.key.name
  return node.key.type === 'Literal' ? String(node.key.value) : null
}

export const noRightAlignedCellsRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep every table column and entity cell aligned to the left, numbers included.',
    },
    messages: {
      rightAlignedColumn:
        'Table columns never align right, numbers included. Remove `align: {{value}}`.',
      rightAlignedCell:
        '`{{token}}` right-aligns entity cell content. Table cells start at the left edge, numbers included.',
    },
  },
  create(context) {
    if (!isRuntimeOwnerFile(context.filename)) return {}

    const entityFile = isEntityOwnerFile(context.filename)

    const reportClasses = (node: ESTree.Node, text: string) => {
      const token = rightAlignedClassPattern.exec(text)?.[0].trim().split(':').at(-1)
      if (!token) return
      context.report({ node, messageId: 'rightAlignedCell', data: { token } })
    }

    return {
      Property(node) {
        if (propertyName(node) !== 'align') return
        if (node.value.type !== 'Literal' || node.value.value !== 'right') return
        context.report({ node, messageId: 'rightAlignedColumn', data: { value: "'right'" } })
      },
      Literal(node) {
        if (entityFile && typeof node.value === 'string') reportClasses(node, node.value)
      },
      TemplateElement(node) {
        if (entityFile) reportClasses(node, node.value.cooked ?? node.value.raw)
      },
    }
  },
})
