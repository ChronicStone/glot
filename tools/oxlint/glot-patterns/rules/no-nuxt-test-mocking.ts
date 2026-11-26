import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

function mockedRuntime(callee: ESTree.Expression): string | null {
  if (callee.type === 'Identifier' && callee.name === 'mockNuxtImport') return 'mockNuxtImport'
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'vi' &&
    callee.property.name === 'stubGlobal'
  ) {
    return 'vi.stubGlobal'
  }
  return null
}

export const noNuxtTestMockingRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Nuxt/global reconstruction in tests; mount the production owner and fake only external I/O.',
    },
    messages: {
      runtimeMock:
        '`{{mock}}` reconstructs application runtime instead of testing its behavior. Mount the production component/engine with real local owners and replace only external I/O.',
    },
  },
  create(context) {
    if (!/(?:\.(?:test|spec)\.[^/]+|\/tests?\/)/u.test(context.filename)) return {}

    return {
      CallExpression(node) {
        const mock = mockedRuntime(node.callee)
        if (mock === null) return
        context.report({ node, messageId: 'runtimeMock', data: { mock } })
      },
    }
  },
})
