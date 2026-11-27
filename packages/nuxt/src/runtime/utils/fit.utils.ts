function lineBox(element: Element) {
  let current: Element | null = element

  while (current && getComputedStyle(current).display.startsWith('inline')) {
    current = current.parentElement
  }

  return current ?? element
}

function contentWidth(element: Element) {
  const style = getComputedStyle(element)

  return (
    element.clientWidth -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight)
  )
}

function roomFor(options: { box: Element; node: Node }) {
  const siblings = [...options.box.children].filter((child) => !child.contains(options.node))
  const taken = siblings.reduce((total, child) => total + child.getBoundingClientRect().width, 0)
  const gap = Number.parseFloat(getComputedStyle(options.box).columnGap) || 0

  return Math.max(0, contentWidth(options.box) - taken - gap * siblings.length)
}

function textWidth(options: { element: Element; text: string }) {
  const style = getComputedStyle(options.element)
  const context = new OffscreenCanvas(1, 1).getContext('2d')

  if (!context) {
    return 0
  }

  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

  return context.measureText(options.text).width
}

export function measureLine(options: { node: Text | Element; attribute: string | null }) {
  if (options.node instanceof Text) {
    const element = options.node.parentElement

    if (!element) {
      return null
    }

    const range = document.createRange()

    range.selectNodeContents(options.node)

    const rects = [...range.getClientRects()]
    const lines = new Set(rects.map((rect) => Math.round(rect.top))).size
    const used = rects.reduce((total, rect) => total + rect.width, 0)

    return {
      used: Math.round(used),
      room: Math.round(roomFor({ box: lineBox(element), node: options.node })),
      lines,
    }
  }

  const text = options.attribute ? (options.node.getAttribute(options.attribute) ?? '') : ''

  return {
    used: Math.round(textWidth({ element: options.node, text })),
    room: Math.round(contentWidth(options.node)),
    lines: 1,
  }
}
