import Handlebars from 'handlebars'
import {
  PREVIEW_DEMO_BRANDS,
  PREVIEW_DEMO_DATES,
  PREVIEW_DEMO_KINDS,
  PREVIEW_DEMO_SAMPLE,
  PREVIEW_DEMO_TEMPLATES,
} from '../constants/preview-demo.constants.ts'
import type { PreviewAdapterCatalog, PreviewAdapterRenderRequest } from '@glot/contract'
import type { DemoBrand, DemoTemplate } from '../types/preview-demo.types.ts'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function templatePaths(template: DemoTemplate) {
  return [
    ...(template.subject ? [template.subject] : []),
    ...template.body,
    ...(template.action ? [template.action] : []),
    ...template.footer,
  ]
}

export function demoCatalog(): PreviewAdapterCatalog {
  return {
    brands: Object.values(PREVIEW_DEMO_BRANDS).map(({ id, name, sources }) => ({
      id,
      name,
      sources: [...sources],
    })),
    templates: Object.values(PREVIEW_DEMO_TEMPLATES).map((template) => ({
      id: template.id,
      name: template.name,
      group: template.group,
      kind: template.kind,
      texts: templatePaths(template).map((path) => [...path]),
    })),
    sendTest: true,
  }
}

function findTemplate(id: string) {
  return Object.values(PREVIEW_DEMO_TEMPLATES).find((template) => template.id === id)
}

function findBrand(id: string) {
  return Object.values(PREVIEW_DEMO_BRANDS).find((brand) => brand.id === id)
}

function renderer(options: { request: PreviewAdapterRenderRequest; brand: DemoBrand }) {
  const texts = new Map(options.request.texts.map((text) => [JSON.stringify(text.path), text]))
  const language = options.request.language

  const data = {
    ...PREVIEW_DEMO_SAMPLE,
    brandName: options.brand.name,
    date:
      Object.entries(PREVIEW_DEMO_DATES).find(([code]) => code === language)?.[1] ??
      PREVIEW_DEMO_DATES.en,
  }

  function plain(path: readonly string[]) {
    const text = texts.get(JSON.stringify(path))

    if (!text) {
      return `[${path.join('.')}]`
    }

    try {
      return Handlebars.compile(text.value, { noEscape: true })(data)
    } catch {
      return text.value
    }
  }

  function marked(path: readonly string[]) {
    const text = texts.get(JSON.stringify(path))
    const value = plain(path)

    return text ? `<span data-glot-text="${escapeHtml(text.id)}">${value}</span>` : value
  }

  return { plain, marked, data }
}

function emailHtml(options: {
  template: DemoTemplate
  brand: DemoBrand
  texts: ReturnType<typeof renderer>
}) {
  const { template, brand, texts } = options

  const paragraphs = template.body.map(
    (path) => `<p style="margin:0 0 14px">${texts.marked(path)}</p>`,
  )

  const action = template.action
    ? `<p style="margin:22px 0"><a href="${texts.data.lotUrl}" style="display:inline-block;background:${brand.color};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">${texts.marked(template.action)}</a></p>`
    : ''

  const footer = template.footer.map((path) => texts.marked(path)).join('<br>')

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f5f7;font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2430">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:17px;margin-bottom:18px"><span style="width:14px;height:14px;border-radius:4px;background:${brand.color};display:inline-block"></span>${escapeHtml(brand.name.toLowerCase())}</div>
<div style="background:#fff;border-radius:12px;padding:26px 24px;box-shadow:0 1px 2px rgba(16,24,40,.06)">
${paragraphs.join('\n')}
<div style="display:flex;gap:12px;align-items:center;border:1px solid #e6e8ee;border-radius:10px;padding:10px;margin:6px 0 4px"><div style="width:64px;height:48px;border-radius:6px;background:linear-gradient(135deg,#dfe4ee,#c6cfdf)"></div><div><b>${escapeHtml(texts.data.lotName)}</b><br><span style="color:#6b7280;font-size:13px">Lot ${texts.data.lotNumber} · ${texts.data.city}</span></div></div>
${action}
</div>
<p style="color:#6b7280;font-size:12px;margin:18px 4px 0">${footer}<br>Agorastore · 33 rue Lafayette, 75009 Paris</p>
</div></body></html>`
}

function documentHtml(options: {
  template: DemoTemplate
  brand: DemoBrand
  texts: ReturnType<typeof renderer>
}) {
  const { template, brand, texts } = options
  const title = template.subject ? texts.marked(template.subject) : ''

  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#eceef2;font:14px/1.5 Georgia,serif;color:#1f2430">
<div style="max-width:620px;margin:24px auto;background:#fff;padding:40px 44px;box-shadow:0 2px 10px rgba(16,24,40,.08)">
<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid ${brand.color};padding-bottom:12px;margin-bottom:22px"><b style="font-size:20px">${escapeHtml(brand.name)}</b><span style="font-family:ui-monospace,monospace;font-size:12px">${texts.data.invoiceNumber}</span></div>
<h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
${template.body.map((path) => `<p>${texts.marked(path)}</p>`).join('\n')}
<p style="color:#6b7280;font-size:12px;margin-top:30px">${template.footer.map((path) => texts.marked(path)).join('<br>')}</p>
</div></body></html>`
}

export function renderDemo(request: PreviewAdapterRenderRequest) {
  const template = findTemplate(request.template)
  const brand = findBrand(request.brand)

  if (!template || !brand) {
    return null
  }

  const texts = renderer({ request, brand })

  if (template.kind === PREVIEW_DEMO_KINDS.SMS) {
    return {
      kind: template.kind,
      subject: null,
      from: brand.name.toUpperCase(),
      html: null,
      text: template.body.map((path) => texts.plain(path)).join(' '),
    }
  }

  return {
    kind: template.kind,
    subject: template.subject ? texts.plain(template.subject) : null,
    from: `${brand.name} <encheres@${brand.domain}>`,
    html:
      template.kind === PREVIEW_DEMO_KINDS.DOCUMENT
        ? documentHtml({ template, brand, texts })
        : emailHtml({ template, brand, texts }),
    text: null,
  }
}
