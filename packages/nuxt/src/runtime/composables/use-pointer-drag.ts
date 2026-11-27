import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { DRAG } from '../constants/widget.constants.ts'

export function usePointerDrag(options: {
  handle: Readonly<Ref<HTMLElement | null>>
  ignore: string | null
  onMove: (delta: { dx: number; dy: number }) => void
  onEnd: (delta: { dx: number; dy: number }) => void
}) {
  const moved = ref<boolean>(false)
  const dragging = ref<boolean>(false)
  let start: { x: number; y: number; id: number } | null = null

  function down(event: PointerEvent) {
    if (
      event.button !== 0 ||
      (options.ignore && event.target instanceof Element && event.target.closest(options.ignore))
    ) {
      return
    }

    start = { x: event.clientX, y: event.clientY, id: event.pointerId }
    moved.value = false
    options.handle.value?.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) {
      return
    }

    const delta = { dx: event.clientX - start.x, dy: event.clientY - start.y }

    if (!moved.value && Math.hypot(delta.dx, delta.dy) < DRAG.THRESHOLD) {
      return
    }

    if (!moved.value) {
      moved.value = true
      dragging.value = true
    }

    options.onMove(delta)
  }

  function up(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) {
      return
    }

    const delta = { dx: event.clientX - start.x, dy: event.clientY - start.y }

    start = null
    dragging.value = false

    if (moved.value) {
      options.onEnd(delta)
    }
  }

  watch(
    options.handle,
    (element, previous) => {
      for (const [name, listener] of [
        ['pointerdown', down],
        ['pointermove', move],
        ['pointerup', up],
        ['pointercancel', up],
      ] as const) {
        previous?.removeEventListener(name, listener)
        element?.addEventListener(name, listener)
      }
    },
    { immediate: true },
  )

  return { moved, dragging }
}
