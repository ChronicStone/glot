import { dirname, resolve } from 'node:path'

import { defineRule } from '@oxlint/plugins'

import type { ESTree } from '@oxlint/plugins'

import { isRuntimeOwnerFile, normalizeFilename } from '../shared/paths.ts'

const nuxtRuntimeImports = new Set([
  'computed',
  'nextTick',
  'onBeforeMount',
  'onBeforeUnmount',
  'onMounted',
  'onUnmounted',
  'reactive',
  'readonly',
  'ref',
  'shallowRef',
  'toRaw',
  'toRef',
  'toRefs',
  'unref',
  'watch',
  'watchEffect',
])

function importedName(specifier: ESTree.ImportDeclarationSpecifier) {
  if (specifier.type !== 'ImportSpecifier') return null
  return specifier.imported.type === 'Literal'
    ? String(specifier.imported.value)
    : specifier.imported.name
}

function targetsEntity(filename: string, source: string) {
  if (/^(?:~|@)\/entities(?:\/|$)/u.test(source)) return true
  if (!source.startsWith('.')) return false
  const target = normalizeFilename(resolve(dirname(filename), source))
  if (dirname(target) === dirname(normalizeFilename(filename))) return false
  return target.endsWith('/entities') || target.includes('/entities/')
}

export const noManualRuntimeImportsRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Use Nuxt auto-imports for entity and configured runtime symbols inside transformed app code.',
    },
    messages: {
      entityImport:
        '`{{source}}` resolves into an auto-imported entity directory. Remove the import and run the owner `dev:prepare` when declarations are stale.',
      runtimeImport:
        '`{{name}}` is configured as a Nuxt auto-import in app runtime. Remove the manual `{{source}}` import.',
    },
  },
  create(context) {
    if (!isRuntimeOwnerFile(context.filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        const typeOnly =
          node.importKind === 'type' ||
          node.specifiers.every(
            (specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type',
          )
        if (typeOnly || source.endsWith('.vue')) return

        if (targetsEntity(context.filename, source)) {
          context.report({ node, messageId: 'entityImport', data: { source } })
          return
        }

        if (source !== 'vue' && source !== '#imports') return
        for (const specifier of node.specifiers) {
          if (
            node.importKind === 'type' ||
            (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type')
          ) {
            continue
          }
          const name = importedName(specifier)
          if (name === null || !nuxtRuntimeImports.has(name)) continue
          context.report({
            node: specifier,
            messageId: 'runtimeImport',
            data: { name, source },
          })
        }
      },
    }
  },
})
