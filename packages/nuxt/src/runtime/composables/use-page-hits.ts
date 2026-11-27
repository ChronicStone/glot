import { onScopeDispose, shallowRef, watch } from 'vue'
import type { App, Ref } from 'vue'
import type { KeyLog, PlacedHit } from '../types/widget.types.ts'
import { collectPageNodes } from '../utils/page-nodes.utils.ts'
import { hitRect, matchPageNodes } from '../utils/page-hits.utils.ts'

export function usePageHits(options: { app: App; log: KeyLog; active: Ref<boolean> }) {
  const placed = shallowRef<PlacedHit[]>([])
  let frame = 0
  let observer: MutationObserver | null = null

  function measure() {
    const tree = options.app._instance?.subTree
    const nodes = tree ? collectPageNodes(tree) : []

    placed.value = matchPageNodes({ nodes, log: options.log })
      .map((hit) => ({ hit, rect: hitRect(hit) }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0)

    return placed.value
  }

  function schedule() {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
  }

  function stop() {
    observer?.disconnect()
    observer = null
    window.removeEventListener('scroll', schedule, true)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
    frame = 0
  }

  watch(
    options.active,
    (active) => {
      stop()

      if (!active) {
        return
      }

      observer = new MutationObserver(schedule)
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      })
      window.addEventListener('scroll', schedule, { capture: true, passive: true })
      window.addEventListener('resize', schedule, { passive: true })
      schedule()
    },
    { immediate: true },
  )

  watch(() => options.log.keys.size, schedule)

  onScopeDispose(stop)

  return { placed, measure }
}
