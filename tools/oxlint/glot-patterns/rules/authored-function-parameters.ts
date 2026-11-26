import { defineRule } from '@oxlint/plugins'
import type { ESTree } from '@oxlint/plugins'

export const authoredFunctionParametersRule = defineRule({
  meta: {
    type: 'problem',
    docs: { description: 'Keep authored inputs short and group positional primitives.' },
    messages: {
      tooMany: 'Use at most two parameters: options, or an entity/transaction plus options.',
      primitives: 'Group multiple primitive parameters in an inline options object.',
    },
  },
  create(context) {
    function inspect(node: ESTree.ArrowFunctionExpression | ESTree.Function) {
      const parent = node.parent
      const parameters = node.params.filter(
        (parameter) => parameter.type !== 'Identifier' || parameter.name !== 'this',
      )

      if (parent?.type === 'CallExpression' || parent?.type === 'NewExpression') return
      if (parent?.type === 'MethodDefinition') {
        if (parent.override) return
        if (parent.kind === 'constructor' && parent.parent.parent?.type === 'ClassDeclaration') {
          const owner = parent.parent.parent

          if (
            owner.decorators.some(
              (decorator) =>
                decorator.expression.type === 'CallExpression' &&
                decorator.expression.callee.type === 'Identifier' &&
                decorator.expression.callee.name === 'inject',
            )
          )
            return
        }
        if (
          /\.middleware\.[cm]?ts$/u.test(context.filename) &&
          parent.key.type === 'Identifier' &&
          parent.key.name === 'handle'
        )
          return
      }

      if (parameters.length > 2) {
        context.report({ node, messageId: 'tooMany' })
        return
      }

      const primitiveCount = parameters.filter((parameter) => {
        const input = parameter.type === 'AssignmentPattern' ? parameter.left : parameter
        const annotation = 'typeAnnotation' in input ? input.typeAnnotation?.typeAnnotation : null

        if (
          !annotation &&
          parameter.type === 'AssignmentPattern' &&
          parameter.right.type === 'Literal'
        ) {
          return (
            parameter.right.value === null ||
            ['string', 'number', 'boolean', 'bigint'].includes(typeof parameter.right.value)
          )
        }

        const types =
          annotation?.type === 'TSUnionType' ? annotation.types : annotation ? [annotation] : []

        return (
          types.length > 0 &&
          types.every((type) =>
            [
              'TSStringKeyword',
              'TSNumberKeyword',
              'TSBooleanKeyword',
              'TSBigIntKeyword',
              'TSSymbolKeyword',
              'TSLiteralType',
              'TSNullKeyword',
              'TSUndefinedKeyword',
            ].includes(type.type),
          )
        )
      }).length

      if (primitiveCount > 1) context.report({ node, messageId: 'primitives' })
    }

    return {
      FunctionDeclaration: inspect,
      FunctionExpression: inspect,
      ArrowFunctionExpression: inspect,
    }
  },
})
