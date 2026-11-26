import { fileURLToPath } from 'node:url'
import { defineConfig } from 'oxlint'

export default defineConfig({
  jsPlugins: [
    {
      name: 'glot-patterns',
      specifier: fileURLToPath(new URL('../index.ts', import.meta.url)),
    },
  ],
  rules: {
    curly: ['error', 'all'],
    'glot-patterns/authored-function-parameters': 'error',
    'glot-patterns/logical-code-spacing': 'error',
  },
})
