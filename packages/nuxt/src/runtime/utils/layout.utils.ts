import { DOCK_SIDES, DRAG, WIDGET_LAYOUT } from '../constants/widget.constants.ts'
import type { DockSide, ScreenPoint } from '../types/widget.types.ts'

export function clampPoint(options: {
  point: ScreenPoint
  size: { width: number; height: number }
}) {
  return {
    x: Math.min(
      Math.max(options.point.x, WIDGET_LAYOUT.EDGE),
      Math.max(WIDGET_LAYOUT.EDGE, window.innerWidth - options.size.width - WIDGET_LAYOUT.EDGE),
    ),
    y: Math.min(
      Math.max(options.point.y, WIDGET_LAYOUT.EDGE),
      Math.max(WIDGET_LAYOUT.EDGE, window.innerHeight - options.size.height - WIDGET_LAYOUT.EDGE),
    ),
  }
}

export function otherSide(side: DockSide) {
  return side === DOCK_SIDES.LEFT ? DOCK_SIDES.RIGHT : DOCK_SIDES.LEFT
}

export function coveredBy(options: { rect: DOMRect; side: DockSide }) {
  const from =
    options.side === DOCK_SIDES.LEFT
      ? WIDGET_LAYOUT.EDGE
      : window.innerWidth - WIDGET_LAYOUT.DRAWER_SPACE

  const to = from + WIDGET_LAYOUT.DRAWER_SPACE

  return options.rect.right > from && options.rect.left < to
}

export function nearerSide(rect: DOMRect) {
  return rect.left + rect.width / 2 < window.innerWidth / 2 ? DOCK_SIDES.LEFT : DOCK_SIDES.RIGHT
}

export function dragThreshold(pointerType: string) {
  return pointerType === 'mouse' ? DRAG.THRESHOLD_MOUSE : DRAG.THRESHOLD_TOUCH
}
