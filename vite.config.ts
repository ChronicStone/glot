import { defineConfig } from 'vite-plus'

const applicationRuntimeFiles = [
  'apps/web/app/**/*.{ts,tsx,vue}',
  'apps/web/server/**/*.{ts,tsx}',
  'packages/nuxt/src/runtime/**/*.{ts,vue}',
]
const apiClientMessage = 'Call the API through $api.'
const queryClientMessage = 'Resolve $queryClient from useNuxtApp().'
const restrictedImports = [
  { name: '@tanstack/vue-query', importNames: ['useQueryClient'], message: queryClientMessage },
  { name: '#imports', importNames: ['useQueryClient'], message: queryClientMessage },
  {
    name: '#imports',
    importNames: ['$fetch', 'useFetch', 'useLazyFetch'],
    message: apiClientMessage,
  },
  { name: 'ofetch', message: apiClientMessage },
]
const apiTransportImports = [
  { name: '@orpc/client', allowTypeImports: true, message: apiClientMessage },
  { name: '@orpc/client/fetch', allowTypeImports: true, message: apiClientMessage },
  { name: '@glot/sdk', allowTypeImports: true, message: apiClientMessage },
]
const restrictedGlobals = [
  { name: 'useQueryClient', message: queryClientMessage },
  ...['$fetch', 'useFetch', 'useLazyFetch'].map((name) => ({ name, message: apiClientMessage })),
]
const generatedPatterns = [
  '.claude/**',
  '**/.nuxt/**',
  '**/.output/**',
  'packages/database/migrations/**',
  'docs/openapi.json',
]

export default defineConfig({
  fmt: {
    ignorePatterns: generatedPatterns,
    printWidth: 100,
    proseWrap: 'preserve',
    semi: false,
    singleQuote: true,
  },
  lint: {
    ignorePatterns: [...generatedPatterns, 'tools/oxlint/**'],
    jsPlugins: [{ name: 'glot-patterns', specifier: './tools/oxlint/glot-patterns/index.ts' }],
    options: {
      typeAware: true,
      typeCheck: false,
    },
    plugins: ['typescript', 'unicorn', 'import', 'vitest', 'vue'],
    rules: {
      eqeqeq: 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'no-void': 'error',
      'prefer-const': 'warn',
      'import/no-duplicates': 'error',
      'import/no-named-as-default': 'off',
      'typescript/await-thenable': 'error',
      'typescript/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'typescript/no-dynamic-delete': 'off',
      'typescript/no-empty-object-type': 'off',
      'typescript/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/prefer-string-slice': 'off',
      'glot-patterns/no-right-aligned-cells': 'error',
      'glot-patterns/no-type-assertions-in-application-runtime': 'error',
      'glot-patterns/require-explicit-ref-type': 'error',
    },
    overrides: [
      {
        files: [
          'apps/web/server/**/*.{ts,tsx}',
          'packages/{auth,contract,database,sdk,utils}/**/*.{ts,tsx}',
          'tooling/**/*.{ts,tsx}',
          'apps/web/app/**/*.ts',
          'packages/{ui,nuxt}/src/**/*.ts',
        ],
        rules: {
          'glot-patterns/backend-structural-ownership': 'error',
          'glot-patterns/authored-function-parameters': 'error',
          'glot-patterns/logical-code-spacing': 'error',
          curly: ['error', 'all'],
          'func-style': ['error', 'declaration', { allowArrowFunctions: false }],
        },
      },
      {
        files: ['apps/web/server/**', 'packages/**', 'tools/**'],
        env: { node: true },
      },
      {
        files: applicationRuntimeFiles,
        rules: {
          'typescript/no-explicit-any': 'error',
          'no-restricted-imports': [
            'error',
            { paths: [...restrictedImports, ...apiTransportImports] },
          ],
          'no-restricted-globals': ['error', ...restrictedGlobals],
          'arrow-body-style': ['error', 'as-needed'],
          'func-style': ['error', 'declaration', { allowArrowFunctions: false }],
          'no-else-return': 'error',
          'require-await': 'error',
        },
      },
      {
        files: ['apps/web/app/plugins/2.api.ts', 'apps/web/server/**'],
        rules: {
          'no-restricted-imports': ['error', { paths: restrictedImports }],
        },
      },
      {
        files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**'],
        rules: {
          'func-style': 'off',
          'no-console': 'off',
          'require-await': 'off',
          'typescript/consistent-type-assertions': 'off',
        },
      },
    ],
  },
  run: {
    cache: { scripts: false, tasks: true },
  },
  staged: {
    '*.{js,json,jsonc,md,mjs,ts,tsx,vue,yaml,yml}': 'vp check --fix',
  },
})
