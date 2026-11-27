import { PAGE_OWNER } from '../constants/widget.constants.ts'
import type { KeyLog, PageHit, PageNode } from '../types/widget.types.ts'

function textMatches(options: { texts: Map<string, string>; text: string }) {
  const wanted = options.text.trim()
  const exact = [...options.texts].filter(([, value]) => wanted && value.trim() === wanted)

  if (exact.length > 0) {
    const start = options.text.indexOf(wanted)

    return [{ keys: exact.map(([key]) => key), start, end: start + wanted.length }]
  }

  const taken: Array<{ keys: string[]; start: number; end: number }> = []

  const candidates = [...options.texts]
    .flatMap(([key, value]) => (value.trim().length > 1 ? [{ key, value: value.trim() }] : []))
    .toSorted((a, b) => b.value.length - a.value.length)

  for (const { key, value } of candidates) {
    const start = options.text.indexOf(value)
    const end = start + value.length
    const overlaps = taken.some((hit) => start < hit.end && end > hit.start)

    if (start >= 0 && !overlaps) {
      taken.push({ keys: [key], start, end })
    }
  }

  return taken
}

function nodeMatches(options: { node: PageNode; log: KeyLog }) {
  let owner = options.node.owner

  while (owner) {
    const texts = options.log.owners.get(owner.uid)
    const found = texts ? textMatches({ texts, text: options.node.text }) : []

    if (found.length > 0) {
      return found
    }

    owner = owner.parent
  }

  const page = options.log.owners.get(PAGE_OWNER)

  return page ? textMatches({ texts: page, text: options.node.text }) : []
}

export function matchPageNodes(options: { nodes: PageNode[]; log: KeyLog }): PageHit[] {
  return options.nodes.flatMap((node, index) => {
    const ranged = !node.attribute && node.node instanceof Text

    return nodeMatches({ node, log: options.log }).map((found) => ({
      id: `${index}:${node.attribute ?? ''}:${found.keys[0]}`,
      keys: found.keys,
      node: node.node,
      attribute: node.attribute,
      start: ranged ? found.start : 0,
      end: ranged ? found.end : 0,
    }))
  })
}

export function hitRect(hit: PageHit) {
  if (hit.node instanceof Text && hit.end > hit.start) {
    const range = document.createRange()

    range.setStart(hit.node, hit.start)
    range.setEnd(hit.node, Math.min(hit.end, hit.node.length))

    return range.getBoundingClientRect()
  }

  if (hit.node instanceof Text) {
    const range = document.createRange()

    range.selectNodeContents(hit.node)

    return range.getBoundingClientRect()
  }

  return hit.node.getBoundingClientRect()
}

export function isVisible(rect: DOMRect) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

export function contains(options: { rect: DOMRect; x: number; y: number }) {
  const { rect, x, y } = options

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}
