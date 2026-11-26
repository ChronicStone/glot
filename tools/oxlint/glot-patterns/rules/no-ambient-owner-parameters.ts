import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import { isRuntimeOwnerFile } from '../shared/paths.ts'

const ambientNames = new Set([
  '$client',
  '$formApi',
  '$i18n',
  '$queryClient',
  'activeRoute',
  'currentRoute',
  'formApi',
  'i18n',
  'nuxtApp',
  'queryClient',
  'route',
  'router',
])

function bindingNames(pattern: ESTree.BindingPattern | ESTree.ParamPattern): string[] {
  if (pattern.type === 'TSParameterProperty') return bindingNames(pattern.parameter)
  if (pattern.type === 'AssignmentPattern') return bindingNames(pattern.left)
  if (pattern.type === 'RestElement') return bindingNames(pattern.argument)
  if (pattern.type === 'Identifier') return [pattern.name]
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap((element) => (element === null ? [] : bindingNames(element)))
  }
  return pattern.properties.flatMap((property) =>
    property.type === 'RestElement'
      ? bindingNames(property.argument)
      : bindingNames(property.value),
  )
}

function ambientName(name: string) {
  return ambientNames.has(name) || /Store$/u.test(name)
}

function isAuthoredFunction(node: ESTree.ArrowFunctionExpression | ESTree.Function) {
  if (
    node.parent.type === 'ExportNamedDeclaration' ||
    node.parent.type === 'ExportDefaultDeclaration'
  ) {
    return true
  }
  return (
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.parent.type === 'VariableDeclarator' &&
    node.parent.parent.type === 'VariableDeclaration' &&
    node.parent.parent.parent.type === 'ExportNamedDeclaration'
  )
}

export const noAmbientOwnerParametersRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Resolve Nuxt services, stores, and route state inside their runtime owner.',
    },
    messages: {
      ambient:
        '`{{name}}` is ambient application context. Resolve it inside the owning function instead of threading it through parameters.',
    },
  },
  create(context) {
    if (!isRuntimeOwnerFile(context.filename)) return {}

    const inspect = (node: ESTree.ArrowFunctionExpression | ESTree.Function) => {
      // Internal helpers and inline callbacks can receive explicit dependencies from their
      // owner; only exported runtime boundaries must resolve ambient application context.
      if (!isAuthoredFunction(node)) return
      for (const parameter of node.params) {
        const name = bindingNames(parameter).find(ambientName)
        if (name === undefined) continue
        context.report({ node: parameter, messageId: 'ambient', data: { name } })
      }
    }

    return {
      ArrowFunctionExpression: inspect,
      FunctionDeclaration: inspect,
      FunctionExpression: inspect,
    }
  },
})
