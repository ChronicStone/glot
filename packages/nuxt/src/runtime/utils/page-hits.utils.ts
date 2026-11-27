import { PAGE_OWNER } from '../constants/widget.constants.ts'
import type { KeyLog, PageHit, PageNode } from '../types/widget.types.ts'

function textMatch(options: { texts: Map<string, string>; text: string }) {
  const wanted = options.text.trim()
  const exact = [...options.texts].filter(([, value]) => value.trim() === wanted && wanted)

  if (exact.length > 0) {
    const start = options.text.indexOf(wanted)

    return { keys: exact.map(([key]) => key), start, end: start + wanted.length }
  }

  const contained = [...options.texts]
    .filter(([, value]) => value.trim().length > 1 && options.text.includes(value.trim()))
    .toSorted(([, a], [, b]) => b.length - a.length)
    .at(0)

  if (!contained) {
    return null
  }

  const value = contained[1].trim()
  const start = options.text.indexOf(value)

  return { keys: [contained[0]], start, end: start + value.length }
}

function nodeMatch(options: { node: PageNode; log: KeyLog }) {
  let owner = options.node.owner

  while (owner) {
    const texts = options.log.owners.get(owner.uid)
    const found = texts ? textMatch({ texts, text: options.node.text }) : null

    if (found) {
      return found
    }

    owner = owner.parent
  }

  const page = options.log.owners.get(PAGE_OWNER)

  return page ? textMatch({ texts: page, text: options.node.text }) : null
}

export function matchPageNodes(options: { nodes: PageNode[]; log: KeyLog }): PageHit[] {
  return options.nodes.flatMap((node, index) => {
    const found = nodeMatch({ node, log: options.log })

    return found
      ? [
          {
            id: `${index}:${node.attribute ?? ''}:${found.keys[0]}`,
            keys: found.keys,
            node: node.node,
            attribute: node.attribute,
            start: node.attribute || !(node.node instanceof Text) ? 0 : found.start,
            end: node.attribute || !(node.node instanceof Text) ? 0 : found.end,
          },
        ]
      : []
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
