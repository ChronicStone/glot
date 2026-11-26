import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import type { TypeDeclaration } from './backend-structural-ownership-types.ts'
import {
  backendDirectoryRole,
  backendRole,
  functionValuedVariable,
  hasAuthoredUnderscore,
  isAllowedResourceFactory,
  isBackendFile,
  isCamelCaseIdentifier,
  isClassOnlyRole,
  isDeclarationFile,
  isExportedTypeDeclaration,
  isExportedVariable,
  isFrameworkEntrypoint,
  isUpperSnakeIdentifier,
  isTopLevelDeclaration,
  isTypeDeclaration,
  isTypeOnlyExportAllDeclaration,
  isTypeOnlyExportNamedDeclaration,
  isTypeOwnerFile,
  isUnnecessaryScalarConstAssertion,
  roleFilenameIsValid,
  variableName,
  isWidenedAliasArray,
} from './backend-structural-ownership-utils.ts'
import { normalizeFilename } from '../shared/paths.ts'

export const backendStructuralOwnershipRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep backend declarations in their dedicated ownership files.',
    },
    messages: {
      ambientModule: 'Ambient module declarations belong in a `.d.ts` file.',
      implementationDeclaration:
        'Policy, job, handler, controller, service, and middleware files contain only imports, type-only exports, and their owner class; remove unnecessary `{{kind}}` declarations or move genuinely shared code to its role owner.',
      misplacedType:
        'Named type declarations belong in a `types/` owner directory or a `.d.ts` file; prefer inline annotations for local parameters.',
      nestedType: 'Named type declarations must be top level in their dedicated type owner file.',
      typeOwnerRuntime: 'Type owner files contain type declarations and type exports only.',
      roleHelper:
        'Move helpers to a utility owner only when reusable; keep one-use logic in its owning operation.',
      roleDirectory:
        'Role-owned backend files live under their matching directory; move this declaration to its role directory.',
      roleFilename:
        'Backend role files use a kebab-case subject and dotted role suffix such as `texts.service.ts`.',
      underscoreFilename:
        'Authored backend paths use kebab-case names; remove underscores from this path.',
      constantName: 'Exported semantic constants in `constants/` use UPPER_SNAKE_CASE names.',
      constantArray:
        'Canonical constants use an exported record; derive arrays locally from the canonical record.',
      unnecessaryConst:
        'Const bindings already preserve scalar literals; remove an unnecessary `as const` assertion.',
      libraryObjectName: 'Exported library objects use camelCase names in their owning role file.',
      schemaHelper:
        'Schema, relation, router and contract files use native builder declarations; inline one-use composition instead of inventing helpers.',
    },
  },
  create(context) {
    const filename = normalizeFilename(context.filename)
    if (!isBackendFile(filename)) return {}

    const declarationFile = isDeclarationFile(filename)
    const typeOwner = isTypeOwnerFile(filename)
    const directoryRole = backendDirectoryRole(filename)
    const role = backendRole(filename)
    const implementationRole = directoryRole ?? role
    const implementation = isClassOnlyRole(implementationRole) && !declarationFile
    const inspectFilenameOwnership = (node: ESTree.Program) => {
      if (isFrameworkEntrypoint(filename)) return
      if (hasAuthoredUnderscore(filename)) {
        context.report({ node, messageId: 'underscoreFilename' })
      }
      if (declarationFile) return
      if (directoryRole === null) {
        if (role !== null) context.report({ node, messageId: 'roleDirectory' })
        return
      }
      if (!roleFilenameIsValid(filename, directoryRole)) {
        context.report({ node, messageId: 'roleFilename' })
      }
      if (role !== null && role !== directoryRole) {
        context.report({ node, messageId: 'roleDirectory' })
      }
    }

    const reportType = (node: TypeDeclaration) => {
      if (declarationFile) return
      const topLevel = isTopLevelDeclaration(node)
      if (node.type === 'TSEnumDeclaration' && typeOwner && topLevel) {
        context.report({ node, messageId: 'typeOwnerRuntime' })
        return
      }
      if (typeOwner && topLevel) return
      context.report({ node, messageId: topLevel ? 'misplacedType' : 'nestedType' })
    }

    const inspectImplementationProgram = (node: ESTree.Program) => {
      if (!implementation) return
      let ownerClasses = 0

      for (const statement of node.body) {
        if (statement.type === 'ImportDeclaration' || statement.type === 'EmptyStatement') {
          continue
        }
        if (statement.type === 'ExportAllDeclaration') {
          if (isTypeOnlyExportAllDeclaration(statement)) continue
          context.report({
            node: statement,
            messageId: 'implementationDeclaration',
            data: { kind: statement.type },
          })
          continue
        }
        if (statement.type === 'ExportNamedDeclaration') {
          if (statement.declaration === null) {
            if (isTypeOnlyExportNamedDeclaration(statement)) continue
            context.report({
              node: statement,
              messageId: 'implementationDeclaration',
              data: { kind: statement.type },
            })
            continue
          }
          if (isExportedTypeDeclaration(statement)) continue
          if (statement.declaration.type === 'ClassDeclaration') {
            ownerClasses += 1
            if (ownerClasses === 1) continue
          }
          context.report({
            node: statement.declaration,
            messageId: 'implementationDeclaration',
            data: { kind: statement.declaration.type },
          })
          continue
        }
        if (statement.type === 'ExportDefaultDeclaration') {
          if (isExportedTypeDeclaration(statement)) continue
          if (statement.declaration.type === 'ClassDeclaration') {
            ownerClasses += 1
            if (ownerClasses === 1) continue
          }
          context.report({
            node: statement.declaration,
            messageId: 'implementationDeclaration',
            data: { kind: statement.declaration.type },
          })
          continue
        }
        if (statement.type === 'ClassDeclaration') {
          ownerClasses += 1
          if (ownerClasses === 1) continue
        }
        if (statement.type === 'TSModuleDeclaration' || isTypeDeclaration(statement)) continue
        context.report({
          node: statement,
          messageId: 'implementationDeclaration',
          data: { kind: statement.type },
        })
      }
    }

    const inspectTypeOwnerProgram = (node: ESTree.Program) => {
      if (!typeOwner || declarationFile) return
      for (const statement of node.body) {
        if (
          statement.type === 'ImportDeclaration' ||
          statement.type === 'EmptyStatement' ||
          isTypeDeclaration(statement)
        ) {
          continue
        }
        if (statement.type === 'ExportAllDeclaration') {
          if (!isTypeOnlyExportAllDeclaration(statement)) {
            context.report({ node: statement, messageId: 'typeOwnerRuntime' })
          }
          continue
        }
        if (statement.type === 'ExportDefaultDeclaration' && isExportedTypeDeclaration(statement)) {
          continue
        }
        if (statement.type === 'ExportNamedDeclaration') {
          if (statement.declaration === null) {
            if (!isTypeOnlyExportNamedDeclaration(statement)) {
              context.report({ node: statement, messageId: 'typeOwnerRuntime' })
            }
            continue
          }
          if (isExportedTypeDeclaration(statement)) continue
          context.report({ node: statement.declaration, messageId: 'typeOwnerRuntime' })
          continue
        }
        context.report({ node: statement, messageId: 'typeOwnerRuntime' })
      }
    }

    const inspectLibraryObjectVariables = (declaration: ESTree.VariableDeclaration) => {
      if (directoryRole !== role) return
      for (const item of declaration.declarations) {
        if (!isExportedVariable(item) || functionValuedVariable(item)) continue
        const name = variableName(item)
        if (name !== null && !isCamelCaseIdentifier(name)) {
          context.report({ node: item, messageId: 'libraryObjectName' })
        }
      }
    }

    const inspectRoleProgram = (node: ESTree.Program) => {
      if (role === null || typeOwner || declarationFile || isClassOnlyRole(role)) return
      if (
        role === 'utils' ||
        role === 'repository' ||
        role === 'serializer' ||
        role === 'report' ||
        role === 'mail'
      ) {
        return
      }
      if (role === 'resource') {
        for (const statement of node.body) {
          if (
            statement.type === 'FunctionDeclaration' &&
            !isAllowedResourceFactory(role, statement)
          ) {
            context.report({ node: statement, messageId: 'roleHelper' })
          }
          if (statement.type === 'ClassDeclaration') {
            context.report({ node: statement, messageId: 'roleHelper' })
          }
          if (statement.type === 'ExportNamedDeclaration') {
            if (statement.declaration?.type === 'ClassDeclaration') {
              context.report({ node: statement.declaration, messageId: 'roleHelper' })
            }
            if (statement.declaration?.type === 'VariableDeclaration') {
              inspectLibraryObjectVariables(statement.declaration)
            }
            continue
          }
          if (
            statement.type === 'ExportDefaultDeclaration' &&
            (statement.declaration.type === 'ClassDeclaration' ||
              (statement.declaration.type === 'FunctionDeclaration' &&
                !isAllowedResourceFactory(role, statement.declaration)))
          ) {
            context.report({ node: statement.declaration, messageId: 'roleHelper' })
          }
          if (statement.type !== 'VariableDeclaration') continue
          for (const declaration of statement.declarations) {
            if (functionValuedVariable(declaration) && !isExportedVariable(declaration)) {
              context.report({ node: declaration, messageId: 'roleHelper' })
            }
          }
        }
        return
      }

      if (role === 'schema' || role === 'relation' || role === 'router' || role === 'contract') {
        for (const statement of node.body) {
          if (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') {
            context.report({ node: statement, messageId: 'schemaHelper' })
            continue
          }
          if (statement.type === 'ExportNamedDeclaration') {
            const declaration = statement.declaration
            if (
              declaration?.type === 'FunctionDeclaration' ||
              declaration?.type === 'ClassDeclaration'
            ) {
              context.report({ node: declaration, messageId: 'schemaHelper' })
            }
            if (declaration?.type === 'VariableDeclaration') {
              inspectLibraryObjectVariables(declaration)
            }
            continue
          }
          if (
            statement.type === 'ExportDefaultDeclaration' &&
            (statement.declaration.type === 'FunctionDeclaration' ||
              statement.declaration.type === 'ClassDeclaration')
          ) {
            context.report({ node: statement.declaration, messageId: 'schemaHelper' })
          }
        }
        return
      }

      for (const statement of node.body) {
        if (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') {
          context.report({ node: statement, messageId: 'roleHelper' })
          continue
        }
        if (statement.type === 'ExportNamedDeclaration') {
          const declaration = statement.declaration
          if (
            declaration?.type === 'FunctionDeclaration' ||
            declaration?.type === 'ClassDeclaration'
          ) {
            context.report({ node: declaration, messageId: 'roleHelper' })
          }
          if (declaration?.type === 'VariableDeclaration') {
            if (role === 'validator') inspectLibraryObjectVariables(declaration)
            for (const item of declaration.declarations) {
              if (functionValuedVariable(item)) {
                context.report({ node: item, messageId: 'roleHelper' })
                continue
              }
              if (
                role !== 'constants' ||
                directoryRole !== 'constants' ||
                !isExportedVariable(item)
              )
                continue
              const name = variableName(item)
              if (name !== null && !isUpperSnakeIdentifier(name)) {
                context.report({ node: item, messageId: 'constantName' })
              }
              if (isWidenedAliasArray(item)) {
                context.report({ node: item, messageId: 'constantArray' })
              }
              if (isUnnecessaryScalarConstAssertion(item)) {
                context.report({ node: item, messageId: 'unnecessaryConst' })
              }
            }
          }
          continue
        }
        if (statement.type === 'ExportDefaultDeclaration') {
          if (
            statement.declaration.type === 'FunctionDeclaration' ||
            statement.declaration.type === 'ClassDeclaration'
          ) {
            context.report({ node: statement.declaration, messageId: 'roleHelper' })
          }
          continue
        }
        if (statement.type !== 'VariableDeclaration') continue
        for (const declaration of statement.declarations) {
          if (!functionValuedVariable(declaration)) continue
          context.report({ node: declaration, messageId: 'roleHelper' })
        }
      }
    }

    return {
      Program(node) {
        inspectFilenameOwnership(node)
        inspectImplementationProgram(node)
        inspectTypeOwnerProgram(node)
        inspectRoleProgram(node)
      },
      TSModuleDeclaration(node) {
        if (!declarationFile) context.report({ node, messageId: 'ambientModule' })
      },
      TSTypeAliasDeclaration: reportType,
      TSInterfaceDeclaration: reportType,
      TSEnumDeclaration: reportType,
    }
  },
})
