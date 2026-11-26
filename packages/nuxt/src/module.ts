import { readFile } from 'node:fs/promises'
import { addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { CONFIG_KEY, WIDGET_CSS_TEMPLATE } from './constants/module.constants.ts'
import type { ModuleOptions } from './types/module.types.ts'

export default defineNuxtModule<ModuleOptions>({
  meta: { name: '@glot/nuxt', configKey: CONFIG_KEY },
  defaults: { url: '', project: '' },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = resolver.resolve('./runtime')
    const stylesheet = resolver.resolve('./runtime/styles/widget.css')

    const compiler = await compile(await readFile(stylesheet, 'utf8'), {
      base: resolver.resolve('./runtime/styles'),
      onDependency: () => {},
    })

    const candidates = new Scanner({
      sources: [{ base: runtime, pattern: '**/*.{vue,ts}', negated: false }],
    }).scan()

    const css = compiler.build(candidates).replaceAll(':root', ':host')

    nuxt.options.runtimeConfig.public.glot = { url: options.url, project: options.project }

    addTemplate({
      filename: WIDGET_CSS_TEMPLATE,
      getContents: () => `export default ${JSON.stringify(css)}`,
    })
    addPlugin({ src: resolver.resolve('./runtime/plugins/glot.client.ts'), mode: 'client' })
  },
})
