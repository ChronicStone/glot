import { createApp } from 'vue'
import type { App } from 'vue'
import type { Composer } from 'vue-i18n'
import { CSS_PROPERTY_RULE } from '../../constants/module.constants.ts'
import GlotWidget from '../components/GlotWidget.vue'
import type { KeyLog, WidgetOptions } from '../types/widget.types.ts'

function stopHostShortcuts(host: HTMLElement) {
  for (const name of ['keydown', 'keyup', 'keypress'] as const) {
    host.addEventListener(name, (event) => event.stopPropagation())
  }
}

function followColorScheme(host: HTMLElement) {
  const dark = matchMedia('(prefers-color-scheme: dark)')

  function apply() {
    host.classList.toggle('dark', dark.matches)
  }

  apply()
  dark.addEventListener('change', apply)
}

export function mountWidget(options: {
  app: App
  composer: Composer
  log: KeyLog
  widget: WidgetOptions & { tag: string; css: string }
}) {
  const host = document.createElement(options.widget.tag)
  const root = host.attachShadow({ mode: 'open' })
  const properties = new CSSStyleSheet()
  const sheet = new CSSStyleSheet()
  const container = document.createElement('div')

  properties.replaceSync(options.widget.css.match(CSS_PROPERTY_RULE)?.join('\n') ?? '')
  sheet.replaceSync(options.widget.css.replaceAll(CSS_PROPERTY_RULE, ''))
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, properties]
  root.adoptedStyleSheets = [sheet]
  root.append(container)
  host.setAttribute('popover', 'manual')
  document.body.append(host)
  host.showPopover?.()
  stopHostShortcuts(host)
  followColorScheme(host)

  createApp(GlotWidget, {
    app: options.app,
    composer: options.composer,
    log: options.log,
    options: { url: options.widget.url, project: options.widget.project },
    host,
  }).mount(container)
}
