<script setup lang="ts">
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { useMediaQuery } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { App } from 'vue'
import type { Composer } from 'vue-i18n'
import { usePageHits } from '../composables/use-page-hits.ts'
import { usePageTexts } from '../composables/use-page-texts.ts'
import { useWidgetSession } from '../composables/use-widget-session.ts'
import { NARROW_SCREEN } from '../constants/widget.constants.ts'
import type {
  KeyLog,
  OutlineBox,
  PageRow,
  PlacedHit,
  WidgetOptions,
} from '../types/widget.types.ts'
import { contains } from '../utils/page-hits.utils.ts'
import { canSetLocale } from '../utils/i18n.utils.ts'
import { nestMessage } from '../utils/message.utils.ts'
import { translationIn } from '../utils/text.utils.ts'
import GlotDrawer from './GlotDrawer.vue'
import GlotEditor from './GlotEditor.vue'
import GlotKey from './GlotKey.vue'
import GlotLauncher from './GlotLauncher.vue'
import GlotOutlines from './GlotOutlines.vue'

const props = defineProps<{
  app: App
  composer: Composer
  log: KeyLog
  options: WidgetOptions
  host: HTMLElement
}>()

const drawerOpen = ref<boolean>(false)
const editing = ref<{ key: string; hitId: string | null } | null>(null)
const hovered = ref<PlacedHit | null>(null)
const narrow = useMediaQuery(NARROW_SCREEN)

const { session, client, failure, signingIn, signIn } = useWidgetSession(props.options)
const { texts, unreachable, replace } = usePageTexts({ session, client, log: props.log })

const { placed, measure } = usePageHits({
  app: props.app,
  log: props.log,
  active: computed(() => drawerOpen.value || editing.value !== null),
})

const language = computed(() => props.composer.locale.value)
const memberId = computed(() => session.value?.member.id ?? '')

const languages = computed(() => {
  const project = session.value?.project
  const wanted = [project?.sourceLanguage, ...(session.value?.languages ?? []), language.value]

  return [...new Set(wanted)].filter(
    (code): code is string => !!code && props.composer.availableLocales.includes(code),
  )
})

const clickableKeys = computed(() => new Set(placed.value.flatMap(({ hit }) => hit.keys)))

const rows = computed<PageRow[]>(() =>
  [...props.log.keys].flatMap(([key, shown]) => {
    const text = texts.value.get(key)

    if (!text) {
      return []
    }

    const translation = translationIn({ text, language: language.value })
    const draft = translation?.draft ?? null
    const mine = draft?.authorId === memberId.value ? draft : null

    const notes = [
      translation?.failures[0]?.message,
      mine?.status === DRAFT_STATUSES.DRAFT ? 'Your draft' : null,
      draft?.status === DRAFT_STATUSES.IN_REVIEW ? 'In review' : null,
      translation?.aiWritten ? 'AI' : null,
    ]

    const reason = notes.find(Boolean) ?? ''

    return [
      {
        key,
        text,
        state: translation?.state ?? TEXT_STATES.MISSING,
        value: mine?.value ?? translation?.value ?? shown,
        reason,
        clickable: clickableKeys.value.has(key),
      },
    ]
  }),
)

const stateOf = computed(() => new Map(rows.value.map((row) => [row.key, row.state])))

const fixCount = computed(
  () => rows.value.filter((row) => row.state === TEXT_STATES.NEEDS_FIX).length,
)

const checkCount = computed(
  () => rows.value.filter((row) => row.state === TEXT_STATES.TO_CHECK).length,
)

const launcherStatus = computed(() => {
  if (signingIn.value) return 'Signing in…'

  if (failure.value) return failure.value

  if (!session.value) return 'Sign in'

  return ''
})

const boxes = computed<OutlineBox[]>(() => {
  const outlined = drawerOpen.value || editing.value !== null

  return placed.value.flatMap(({ hit, rect }): OutlineBox[] => {
    const key = hit.keys[0] ?? ''
    const state = stateOf.value.get(key)
    const isEdited = editing.value?.key === key
    const isHovered = hovered.value?.hit.id === hit.id

    if (isEdited) return [{ id: hit.id, rect, tone: 'edit', badge: null }]

    if (!outlined || !state) return []

    if (state === TEXT_STATES.NEEDS_FIX)
      return [{ id: hit.id, rect, tone: 'fix', badge: 'NEEDS_FIX' }]

    if (state === TEXT_STATES.TO_CHECK)
      return [{ id: hit.id, rect, tone: 'check', badge: 'TO_CHECK' }]

    if (isHovered) return [{ id: hit.id, rect, tone: 'check', badge: null }]

    return []
  })
})

const hoverLabel = computed(() => {
  const current = hovered.value
  const key = current?.hit.keys[0]

  if (!current || !key || !(drawerOpen.value || editing.value) || !stateOf.value.has(key)) {
    return null
  }

  const rect = placed.value.find(({ hit }) => hit.id === current.hit.id)?.rect ?? current.rect

  return { key, left: rect.left, top: Math.max(4, rect.top - 30) }
})

const editedText = computed(() => (editing.value ? texts.value.get(editing.value.key) : undefined))

const anchored = computed(() => {
  const current = editing.value

  if (!current) return null

  const exact = placed.value.find(({ hit }) => hit.id === current.hitId)

  return exact ?? placed.value.find(({ hit }) => hit.keys.includes(current.key)) ?? null
})

function hitAt(event: MouseEvent) {
  const pool = drawerOpen.value || editing.value ? placed.value : measure()

  return (
    pool
      .filter(
        ({ rect, hit }) =>
          contains({ rect, x: event.clientX, y: event.clientY }) &&
          texts.value.has(hit.keys[0] ?? ''),
      )
      .toSorted((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height)
      .at(0) ?? null
  )
}

function fromWidget(event: Event) {
  return event.composedPath().includes(props.host)
}

function intercept(event: MouseEvent) {
  if (!session.value || fromWidget(event) || !(drawerOpen.value || event.altKey)) {
    return
  }

  const found = hitAt(event)

  if (!found) {
    return
  }

  event.preventDefault()
  event.stopImmediatePropagation()

  if (event.type === 'click') {
    editing.value = { key: found.hit.keys[0] ?? '', hitId: found.hit.id }
  }
}

function track(event: PointerEvent) {
  if (!fromWidget(event) && (drawerOpen.value || editing.value)) {
    hovered.value = hitAt(event)
  }
}

function escape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (editing.value) {
    editing.value = null
  } else if (drawerOpen.value) {
    drawerOpen.value = false
  }
}

function pick(row: PageRow) {
  const found = placed.value.find(({ hit }) => hit.keys.includes(row.key))

  if (found && found.hit.node instanceof Node) {
    const element =
      found.hit.node instanceof Element ? found.hit.node : found.hit.node.parentElement

    element?.scrollIntoView({ block: narrow.value ? 'start' : 'center', behavior: 'instant' })
  }

  editing.value = { key: row.key, hitId: found?.hit.id ?? null }
}

async function switchLanguage(code: string) {
  editing.value = null

  if (canSetLocale(props.composer)) {
    await props.composer.setLocale(code)
  } else {
    props.composer.locale.value = code
  }
}

function applyDrafts() {
  for (const text of texts.value.values()) {
    const draft = translationIn({ text, language: language.value })?.draft

    if (
      draft &&
      draft.authorId === memberId.value &&
      editing.value?.key !== text.key.path.join('.')
    ) {
      props.composer.mergeLocaleMessage(
        language.value,
        nestMessage({ path: text.key.path, value: draft.value }),
      )
    }
  }
}

async function refreshEdited() {
  const text = editedText.value
  const projectId = session.value?.project.id

  if (text && client.value && projectId) {
    replace(await client.value.texts.get({ projectId, textId: text.id }))
  }
}

async function openLauncher() {
  if (session.value) {
    drawerOpen.value = !drawerOpen.value
  } else {
    await signIn()
  }
}

watch([texts, language], () => nextTick(applyDrafts))

const EVENTS = ['pointerdown', 'mousedown', 'click'] as const

onMounted(() => {
  for (const name of EVENTS) window.addEventListener(name, intercept, true)
  window.addEventListener('pointermove', track, { capture: true, passive: true })
  window.addEventListener('keydown', escape)
})

onBeforeUnmount(() => {
  for (const name of EVENTS) window.removeEventListener(name, intercept, true)
  window.removeEventListener('pointermove', track, true)
  window.removeEventListener('keydown', escape)
})
</script>

<template>
  <GlotOutlines :boxes="boxes" />
  <div
    v-if="hoverLabel"
    class="glot-w"
    data-glot="hover-key"
    :style="{
      position: 'fixed',
      left: `${hoverLabel.left}px`,
      top: `${hoverLabel.top}px`,
      padding: '3px 8px',
      borderRadius: '7px',
      background: 'var(--glot-panel)',
      boxShadow: 'var(--glot-shadow-pop), 0 0 0 1px var(--glot-line)',
      pointerEvents: 'auto',
    }"
  >
    <GlotKey :value="hoverLabel.key" />
  </div>
  <GlotEditor
    v-if="editing && editedText && session && client"
    :key="`${editing.key}:${language}`"
    :text="editedText"
    :text-key="editing.key"
    :language="language"
    :anchor="anchored?.rect ?? null"
    :hit="anchored?.hit ?? null"
    :drawer-open="drawerOpen"
    :member-id="memberId"
    :project-id="session.project.id"
    :can-write="session.languages.includes(language)"
    :client="client"
    :composer="composer"
    @close="editing = null"
    @saved="refreshEdited"
  />
  <GlotDrawer
    v-if="drawerOpen && session && !(narrow && editing)"
    :rows="rows"
    :language="language"
    :languages="languages"
    :selected="editing?.key ?? null"
    :member="session.member.name"
    :place="host.ownerDocument.location.host"
    :glot-url="`${options.url}/projects/${session.project.id}/texts`"
    :unreachable="unreachable"
    @close="
      drawerOpen = false;
      editing = null
    "
    @pick="pick"
    @language="switchLanguage"
  />
  <GlotLauncher
    v-if="!drawerOpen"
    :language="language"
    :fix="fixCount"
    :check="checkCount"
    :status="launcherStatus"
    @open="openLauncher"
  />
</template>
