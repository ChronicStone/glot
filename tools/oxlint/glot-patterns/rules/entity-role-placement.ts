import { basename } from 'node:path'

import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import { isEntityOwnerFile, normalizeFilename } from '../shared/paths.ts'

const canonicalRoleNames = new Set([
  'action',
  'constants',
  'filter',
  'render',
  'resolver',
  'schema',
  'types',
  'utils',
])
const reservedRolePattern =
  /(?:^|-)(?:action|constants|filter|render|resolver|schema|types|utils)(?:-|$)/u
const stableConstantPattern = /^[A-Z][A-Z0-9_]*$/u

function sourceName(filename: string) {
  return basename(normalizeFilename(filename)).replace(/\.(?:[cm]?[jt]sx?|vue)$/u, '')
}

function exportedVariable(node: ESTree.VariableDeclarator) {
  return node.parent.parent.type === 'ExportNamedDeclaration'
}

function exportedType(
  node: ESTree.TSTypeAliasDeclaration | ESTree.TSInterfaceDeclaration | ESTree.TSEnumDeclaration,
) {
  return node.parent.type === 'ExportNamedDeclaration'
}

function authenticatedActionDeclaration(node: ESTree.Node | null | undefined) {
  if (node?.type !== 'VariableDeclaration') return false
  return node.declarations.every(
    (declaration) =>
      declaration.init?.type === 'CallExpression' &&
      declaration.init.callee.type === 'Identifier' &&
      declaration.init.callee.name === 'authenticatedFunction' &&
      declaration.init.arguments[0]?.type === 'ArrowFunctionExpression' &&
      declaration.init.arguments[0].async,
  )
}

export const entityRolePlacementRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep entity declarations in canonical role files and action files limited to commands.',
    },
    messages: {
      canonicalFilename:
        '`{{filename}}` invents a prefixed role filename. Use the canonical `{{role}}.ts(x)` inside a nested entity concern.',
      misplacedType:
        '`{{name}}` is a reusable type declaration in `{{filename}}`. Move it to the owning entity `types.ts`, or inline a one-use parameter shape.',
      misplacedConstant:
        '`{{name}}` is a stable exported constant in `{{filename}}`. Move it to the owning entity `constants.ts`.',
      actionExport:
        '`action.ts(x)` may export only user commands. Move schemas, constants, types, and utilities to their canonical role file.',
    },
  },
  create(context) {
    if (!isEntityOwnerFile(context.filename)) return {}

    const filename = sourceName(context.filename)
    const actionFile = filename === 'action'
    const typesFile = filename === 'types'
    const constantsFile = filename === 'constants' || filename === 'legal-requirements'

    const reportType = (
      node:
        | ESTree.TSTypeAliasDeclaration
        | ESTree.TSInterfaceDeclaration
        | ESTree.TSEnumDeclaration,
    ) => {
      if (typesFile || !exportedType(node)) return
      context.report({
        node,
        messageId: 'misplacedType',
        data: { name: node.id.name, filename },
      })
    }

    return {
      Program(node) {
        if (reservedRolePattern.test(filename) && !canonicalRoleNames.has(filename)) {
          const role = filename.split('-').find((part) => canonicalRoleNames.has(part)) ?? 'role'
          context.report({
            node,
            messageId: 'canonicalFilename',
            data: { filename, role },
          })
        }

        if (!actionFile) return
        for (const statement of node.body) {
          if (statement.type !== 'ExportNamedDeclaration') continue
          if (
            statement.declaration?.type === 'FunctionDeclaration' ||
            authenticatedActionDeclaration(statement.declaration)
          ) {
            continue
          }
          context.report({ node: statement, messageId: 'actionExport' })
        }
      },
      TSTypeAliasDeclaration: reportType,
      TSInterfaceDeclaration: reportType,
      TSEnumDeclaration: reportType,
      VariableDeclarator(node) {
        if (
          constantsFile ||
          !exportedVariable(node) ||
          node.id.type !== 'Identifier' ||
          !stableConstantPattern.test(node.id.name)
        ) {
          return
        }
        context.report({
          node,
          messageId: 'misplacedConstant',
          data: { name: node.id.name, filename },
        })
      },
    }
  },
})
