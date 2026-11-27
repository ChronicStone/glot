import type { HomeOverview } from '@glot/contract'
import { DIGEST_LINKS } from '../constants/digests.constants.ts'

const LANGUAGE_NAMES = new Intl.DisplayNames('en', { type: 'language' })

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => HTML_ESCAPES[character] ?? character)
}

function languageName(language: string) {
  return LANGUAGE_NAMES.of(language) ?? language
}

function plural(options: { count: number; one: string; many: string }) {
  return `${options.count} ${options.count === 1 ? options.one : options.many}`
}

function keyName(path: string[]) {
  return path.join('.')
}

function lines(options: { appUrl: string; overview: HomeOverview }) {
  const { appUrl } = options
  const { needsYou } = options.overview
  const sections: Array<{ title: string; items: Array<{ label: string; url: string }> }> = []

  if (needsYou.fixes.total > 0) {
    sections.push({
      title: `${plural({ count: needsYou.fixes.total, one: 'text', many: 'texts' })} to fix`,
      items: needsYou.fixes.items.map((fix) => ({
        label: `${keyName(fix.key.path)} in ${languageName(fix.language)}: ${fix.reason.message}`,
        url: `${appUrl}/projects/${fix.projectId}/texts?text=${encodeURIComponent(fix.textId)}`,
      })),
    })
  }

  if (needsYou.reviews.length > 0) {
    sections.push({
      title: 'Texts to review',
      items: needsYou.reviews.map((review) => ({
        label: `${plural({ count: review.total, one: 'text', many: 'texts' })} in ${languageName(review.language)}, ${review.projectName}`,
        url: `${appUrl}/projects/${review.projectId}/review/${review.language}`,
      })),
    })
  }

  if (needsYou.drafts.inProgress > 0) {
    sections.push({
      title: `${plural({ count: needsYou.drafts.inProgress, one: 'draft', many: 'drafts' })} to send for review`,
      items: needsYou.drafts.latest.map((draft) => ({
        label: `${keyName(draft.key.path)} in ${languageName(draft.language)}, ${draft.projectName}`,
        url: `${appUrl}/projects/${draft.projectId}/texts?text=${encodeURIComponent(draft.textId)}`,
      })),
    })
  }

  if (needsYou.conflicts.length > 0) {
    sections.push({
      title: 'Changes held back by a conflict',
      items: needsYou.conflicts.map((conflict) => ({
        label: `${plural({ count: conflict.total, one: 'change', many: 'changes' })}, ${conflict.projectName}`,
        url: `${appUrl}/projects/${conflict.projectId}/releases`,
      })),
    })
  }

  return sections
}

export function digestMessage(options: {
  appUrl: string
  name: string
  workspaces: Array<{ name: string; overview: HomeOverview }>
}) {
  const { appUrl } = options
  const settings = `${appUrl}${DIGEST_LINKS.SETTINGS}`

  const total = options.workspaces.reduce((sum, { overview }) => sum + overview.needsYou.total, 0)

  const headline = `${total} ${total === 1 ? 'thing needs' : 'things need'} you in Glot`

  const sections = options.workspaces.map(({ name, overview }) => ({
    name,
    sections: lines({ appUrl, overview }),
  }))

  const footer = `You get this email on days something needs you. Turn it off in your preferences: ${settings}`

  const text = [
    `Hello ${options.name},`,
    headline,
    ...sections.flatMap((workspace) => [
      `${workspace.name}\n${'='.repeat(workspace.name.length)}`,
      ...workspace.sections.map(
        (section) =>
          `${section.title}\n${section.items.map((item) => `- ${item.label}\n  ${item.url}`).join('\n')}`,
      ),
    ]),
    footer,
  ].join('\n\n')

  const html = [
    '<!doctype html>',
    '<html><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b18">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px">',
    `<p style="margin:0 0 4px">Hello ${escapeHtml(options.name)},</p>`,
    `<h1 style="font-size:20px;margin:0 0 20px">${escapeHtml(headline)}</h1>`,
    ...sections.flatMap((workspace) => [
      `<h2 style="font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e6e4de;padding-bottom:6px">${escapeHtml(workspace.name)}</h2>`,
      ...workspace.sections.map(
        (section) =>
          `<h3 style="font-size:14px;margin:16px 0 6px">${escapeHtml(section.title)}</h3><ul style="margin:0;padding-left:20px">${section.items
            .map(
              (item) =>
                `<li style="margin:0 0 6px"><a href="${escapeHtml(item.url)}" style="color:#2f5bd6;text-decoration:none">${escapeHtml(item.label)}</a></li>`,
            )
            .join('')}</ul>`,
      ),
    ]),
    `<p style="margin:28px 0 0;font-size:12px;color:#6b6a63">You get this email on days something needs you. <a href="${escapeHtml(settings)}" style="color:#6b6a63">Turn it off in your preferences</a>.</p>`,
    '</div></body></html>',
  ].join('')

  return { subject: headline, text, html }
}
