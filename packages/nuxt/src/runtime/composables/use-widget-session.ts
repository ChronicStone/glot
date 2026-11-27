import { createGlotClient } from '@glot/sdk'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { WIDGET_RPC_PATH, WIDGET_TIMING } from '../constants/widget.constants.ts'
import type { StoredSession, WidgetOptions } from '../types/widget.types.ts'
import { openSignIn, storeSession, storedSession } from '../utils/session.utils.ts'

export function useWidgetSession(options: WidgetOptions) {
  const session = ref<StoredSession | null>(storedSession(options.project))
  const failure = ref<string>('')
  const signingIn = ref<boolean>(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const client = computed(() =>
    session.value
      ? createGlotClient({ url: options.url, path: WIDGET_RPC_PATH, token: session.value.token })
      : null,
  )

  function keep(next: StoredSession | null) {
    session.value = next
    storeSession({ project: options.project, session: next })
  }

  async function signIn() {
    signingIn.value = true
    failure.value = ''

    try {
      const reply = await openSignIn(options)

      if (reply.session) {
        keep(reply.session)
      } else {
        failure.value = reply.error
      }
    } catch (error) {
      failure.value = error instanceof Error ? error.message : String(error)
    } finally {
      signingIn.value = false
    }
  }

  async function refresh() {
    if (!client.value) {
      return
    }

    try {
      const next = await client.value.widget.token({
        origin: location.origin,
        repository: options.project,
      })

      keep({ ...next, expiresAt: next.expiresAt.toISOString() })
    } catch {
      keep(null)
    }
  }

  watch(
    session,
    (current) => {
      clearTimeout(timer)

      if (current) {
        const delay = Date.parse(current.expiresAt) - Date.now() - WIDGET_TIMING.REFRESH_BEFORE_MS

        timer = setTimeout(refresh, Math.max(delay, 0))
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => clearTimeout(timer))

  return { session, client, failure, signingIn, signIn, signOut: () => keep(null) }
}
