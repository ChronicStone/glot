import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import {
  CONFIG_KEY,
  SHADOW_REWRITES,
  WIDGET_ICONS,
  WIDGET_TEMPLATES,
} from './constants/module.constants.ts'
import type { ModuleOptions } from './types/module.types.ts'

async function widgetCss(resolver: ReturnType<typeof createResolver>) {
  const stylesheet = resolver.resolve('./runtime/styles/widget.css')

  const compiler = await compile(await readFile(stylesheet, 'utf8'), {
    base: resolver.resolve('./runtime/styles'),
    onDependency: () => {},
  })

  const candidates = new Scanner({
    sources: [{ base: resolver.resolve('./runtime'), pattern: '**/*.{vue,ts}', negated: false }],
  }).scan()

  return Object.values(SHADOW_REWRITES).reduce<string>(
    (css, [pattern, replacement]) => css.replace(pattern, replacement),
    compiler.build(candidates),
  )
}

async function widgetIcons() {
  const require = createRequire(import.meta.url)

  const set: {
    icons: Record<string, { body: string }>
    aliases?: Record<string, { parent: string }>
  } = JSON.parse(await readFile(require.resolve('@iconify-json/lucide/icons.json'), 'utf8'))

  return Object.fromEntries(
    Object.values(WIDGET_ICONS).map((name) => {
      const icon = set.icons[name] ?? set.icons[set.aliases?.[name]?.parent ?? '']

      return [name, icon?.body ?? '']
    }),
  )
}

export default defineNuxtModule<ModuleOptions>({
  meta: { name: '@glot/nuxt', configKey: CONFIG_KEY },
  defaults: { enabled: false, url: '', project: '' },
  async setup(options, nuxt) {
    if (!options.enabled) {
      return
    }

    const resolver = createResolver(import.meta.url)
    const [css, icons] = await Promise.all([widgetCss(resolver), widgetIcons()])

    nuxt.options.runtimeConfig.public.glot = { url: options.url, project: options.project }

    addTemplate({
      filename: WIDGET_TEMPLATES.CSS,
      getContents: () => `export default ${JSON.stringify(css)}`,
    })
    addTemplate({
      filename: WIDGET_TEMPLATES.ICONS,
      getContents: () => `export default ${JSON.stringify(icons)}`,
    })
    addPlugin({ src: resolver.resolve('./runtime/plugins/glot.client.ts'), mode: 'client' })
  },
})
