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
    'glot-patterns/no-right-aligned-cells': 'error',
  },
})
