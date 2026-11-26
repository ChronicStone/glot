import { createApp } from 'vue'
import type { Ref } from 'vue'
import GlotWidget from '../components/GlotWidget.vue'

const PROPERTY_RULE = /@property[^{]+\{[^}]*\}/gu

export function mountWidget(options: { tag: string; css: string; seen: Ref<Map<string, string>> }) {
  const host = document.createElement(options.tag)
  const root = host.attachShadow({ mode: 'open' })
  const properties = document.createElement('style')
  const style = document.createElement('style')
  const container = document.createElement('div')

  properties.textContent = options.css.match(PROPERTY_RULE)?.join('\n') ?? ''
  style.textContent = options.css.replaceAll(PROPERTY_RULE, '')
  document.head.append(properties)
  root.append(style, container)
  document.body.append(host)
  createApp(GlotWidget, { seen: options.seen }).mount(container)
}
