import { fileURLToPath } from 'node:url'

import { defineConfig } from 'oxlint'
import antiSlop from 'ultracite/oxlint/anti-slop'

const applicationRuntimeFiles = [
  'apps/web/app/**/*.{ts,tsx,vue}',
  'apps/web/server/**/*.{ts,tsx}',
  'packages/nuxt/src/runtime/**/*.{ts,vue}',
]

export default defineConfig({
  extends: [antiSlop],
  jsPlugins: [
    {
      name: 'glot-patterns',
      specifier: fileURLToPath(new URL('./tools/oxlint/glot-patterns/index.ts', import.meta.url)),
    },
  ],
  rules: {
    'anti-slop/no-conditional-empty-object-spread': 'off',
    'anti-slop/no-known-value-widening': 'off',
    'anti-slop/no-module-mocking': 'off',
    'anti-slop/no-object-parameters': 'off',
    'anti-slop/no-reflect-apply': 'off',
    'anti-slop/no-reflect-get': 'off',
    'anti-slop/no-runtime-typeof': 'off',
    'anti-slop/no-shape-in-symbol-names': 'off',
    'anti-slop/no-unknown-parameters': 'off',
    'anti-slop/no-unknown-returns': 'off',
    'anti-slop/no-unknown-type-aliases': 'off',
    'anti-slop/no-unsafe-dictionary-type': 'off',
    'anti-slop/require-safety-comment-for-type-assertion': 'off',
    'typescript/consistent-type-assertions': 'off',
    'typescript/no-explicit-any': 'off',
    'glot-patterns/authored-function-parameters': 'error',
    'glot-patterns/entity-role-placement': 'error',
    'glot-patterns/no-ambient-owner-parameters': 'error',
    'glot-patterns/no-manual-runtime-imports': 'error',
  },
  overrides: [
    {
      files: applicationRuntimeFiles,
      rules: { 'typescript/no-explicit-any': 'error' },
    },
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**', '**/tests/**'],
      rules: { 'typescript/consistent-type-assertions': 'off' },
    },
  ],
  ignorePatterns: [
    '.claude/**',
    'node_modules/**',
    'dist/**',
    '**/.nuxt/**',
    '**/.nuxt-*/**',
    '.output/**',
    'packages/database/migrations/**',
    'build/**',
    'coverage/**',
    '**/vite.config.ts',
    '**/nuxt.config.ts',
    '**/drizzle.config.ts',
    '*.d.ts',
    'tools/oxlint/glot-patterns/**',
  ],
})
