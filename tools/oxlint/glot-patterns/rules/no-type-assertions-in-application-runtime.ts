import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import { isAppRuntimeFile, normalizeFilename } from '../shared/paths.ts'

type TypeAssertion = ESTree.TSAsExpression

const declarativeConfigCalls = new Set([
  'appLink',
  'defineI18nRoute',
  'definePageMeta',
  'defineProps',
])

function isInsideDeclarativeConfig(node: TypeAssertion) {
  let parent: ESTree.Node | null | undefined = node.parent
  while (parent) {
    if (
      parent.type === 'CallExpression' &&
      parent.callee.type === 'Identifier' &&
      declarativeConfigCalls.has(parent.callee.name)
    )
      return true
    parent = parent.parent
  }
  return false
}

export const noTypeAssertionsInApplicationRuntimeRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow application runtime type assertions while retaining safe literal const assertions.',
    },
    messages: {
      assertion:
        'Application runtime code does not assert `{{assertedType}}`; narrow, parse, annotate, or use `satisfies` instead.',
    },
  },
  create(context) {
    if (!isAppRuntimeFile(context.filename)) return {}
    const filename = normalizeFilename(context.filename)
    if (/\/schema\.[cm]?[jt]sx?$/u.test(filename)) return {}
    if (/\/(?:plugins|server\/utils)\//u.test(filename)) return {}

    const inspect = (node: TypeAssertion) => {
      if (
        node.typeAnnotation.type === 'TSTypeReference' &&
        node.typeAnnotation.typeName.type === 'Identifier' &&
        node.typeAnnotation.typeName.name === 'const'
      )
        return
      if (isInsideDeclarativeConfig(node)) return
      context.report({
        node,
        messageId: 'assertion',
        data: { assertedType: context.sourceCode.getText(node.typeAnnotation) },
      })
    }

    return {
      TSAsExpression: inspect,
    }
  },
})
