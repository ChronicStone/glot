import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

function refKind(callee: ESTree.Expression): 'ref' | 'shallowRef' | null {
  if (callee.type !== 'Identifier') return null
  return callee.name === 'ref' || callee.name === 'shallowRef' ? callee.name : null
}

export const requireExplicitRefTypeRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Require every authored Vue ref to declare its mutable type.',
    },
    messages: {
      explicitRef:
        '`{{kind}}` must use `{{kind}}<Type>()` or `{{kind}}<Type>(initialValue)` so the mutable slot has an explicit contract.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const kind = refKind(node.callee)
        if (kind === null) return
        if ((node.typeArguments?.params.length ?? 0) > 0) return
        context.report({ node, messageId: 'explicitRef', data: { kind } })
      },
    }
  },
})
