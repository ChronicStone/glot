import { defineRule } from '@oxlint/plugins'
import type { ESTree } from '@oxlint/plugins'

export const logicalCodeSpacingRule = defineRule({
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: { description: 'Separate guards, declarations, and returns into readable sections.' },
    messages: {
      section: 'Separate this logical section with a blank line.',
    },
  },
  create(context) {
    function inspectBody(node: ESTree.BlockStatement) {
      for (let index = 1; index < node.body.length; index++) {
        const previous = node.body[index - 1]!
        const current = node.body[index]!
        const declarationBoundary =
          (previous.type === 'VariableDeclaration') !== (current.type === 'VariableDeclaration')
        const sectionBoundary =
          declarationBoundary ||
          current.type === 'ReturnStatement' ||
          current.type === 'IfStatement' ||
          previous.type === 'IfStatement'

        if (!sectionBoundary || current.loc.start.line > previous.loc.end.line + 1) continue

        const between = context.sourceCode.text.slice(previous.range[1], current.range[0])

        if (between.trim() !== '') continue

        context.report({
          node: current,
          messageId: 'section',
          fix: (fixer) => fixer.insertTextAfter(previous, '\n'),
        })
      }
    }

    return {
      BlockStatement: inspectBody,
    }
  },
})
