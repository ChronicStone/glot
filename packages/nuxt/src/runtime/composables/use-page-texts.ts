import type { Text } from '@glot/contract'
import type { GlotClient } from '@glot/sdk'
import { computed, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { WIDGET_TIMING } from '../constants/widget.constants.ts'
import type { KeyLog, StoredSession } from '../types/widget.types.ts'

export function usePageTexts(options: {
  session: Ref<StoredSession | null>
  client: Ref<GlotClient | null>
  log: KeyLog
}) {
  const texts = shallowRef<Map<string, Text>>(new Map())
  const asked = new Set<string>()
  const unreachable = ref<boolean>(false)
  const loading = ref<boolean>(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const missing = computed(() => [...options.log.keys.keys()].filter((key) => !asked.has(key)))

  async function load(wanted: string[]) {
    const client = options.client.value
    const projectId = options.session.value?.project.id
    const keys = wanted.filter((key) => !asked.has(key))

    if (!client || !projectId || keys.length === 0) {
      return
    }

    for (const key of keys) {
      asked.add(key)
    }

    loading.value = true

    try {
      const pages = []

      for (let start = 0; start < keys.length; start += WIDGET_TIMING.KEYS_PER_CALL) {
        pages.push(
          client.texts.byKeys({
            projectId,
            keys: keys.slice(start, start + WIDGET_TIMING.KEYS_PER_CALL),
          }),
        )
      }

      const found = (await Promise.all(pages)).flatMap((page) => page.items)
      const next = new Map(texts.value)

      for (const text of found) {
        next.set(text.key.path.join('.'), text)
      }

      texts.value = next
      unreachable.value = false
    } catch {
      for (const key of keys) {
        asked.delete(key)
      }

      unreachable.value = true
    } finally {
      loading.value = false
    }
  }

  function replace(text: Text) {
    texts.value = new Map(texts.value).set(text.key.path.join('.'), text)
  }

  function reload() {
    asked.clear()

    return load([...options.log.keys.keys()])
  }

  watch(
    [missing, options.client],
    ([keys]) => {
      clearTimeout(timer)
      timer = setTimeout(() => load(keys), WIDGET_TIMING.FETCH_DELAY_MS)
    },
    { immediate: true },
  )

  return { texts, unreachable, loading, replace, reload }
}
