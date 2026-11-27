<script setup lang="ts">
import { CHECK_CODES, checkText } from '@glot/checks'
import type { DraftView, Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { GlotClient } from '@glot/sdk'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '@glot/ui/constants'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Composer } from 'vue-i18n'
import { WIDGET_LAYOUT } from '../constants/widget.constants.ts'
import { nestMessage, withoutPath } from '../utils/message.utils.ts'
import { translationIn } from '../utils/text.utils.ts'
import GlotIcon from './GlotIcon.vue'
import GlotKey from './GlotKey.vue'
import GlotMessageInput from './GlotMessageInput.vue'

const props = defineProps<{
  text: Text
  textKey: string
  language: string
  anchor: DOMRect | null
  drawerOpen: boolean
  memberId: string
  projectId: string
  canWrite: boolean
  client: GlotClient
  composer: Composer
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const STATE_ICONS = {
  [TEXT_STATES.REVIEWED]: 'check',
  [TEXT_STATES.TO_CHECK]: 'eye',
  [TEXT_STATES.NEEDS_FIX]: 'triangle-alert',
  [TEXT_STATES.MISSING]: 'circle-dashed',
} as const

const box = useTemplateRef<HTMLDivElement>('box')

const translation = computed(() => translationIn({ text: props.text, language: props.language }))

const ownDraft = computed(() =>
  translation.value?.draft?.authorId === props.memberId ? translation.value.draft : null,
)

const value = ref<string>(ownDraft.value?.value ?? translation.value?.value ?? '')
const draft = ref<DraftView | null>(ownDraft.value)
const busy = ref<boolean>(false)
const status = ref<string>('')
const savedValue = ref<string>(value.value)

const typed = computed(() =>
  checkText({ source: props.text.source.value, target: value.value, avoid: [] }),
)

const failures = computed(() =>
  value.value === savedValue.value
    ? (draft.value?.failures ?? translation.value?.failures ?? [])
    : typed.value,
)

const state = computed(() => translation.value?.state ?? TEXT_STATES.MISSING)
const height = ref<number>(0)

const base = valueAt(props.composer.getLocaleMessage(props.language))

function valueAt(messages: unknown) {
  return props.text.key.path.reduce<unknown>(
    (node, segment) =>
      typeof node === 'object' && node !== null ? Reflect.get(node, segment) : undefined,
    messages,
  )
}

function preview(next: string) {
  if (typed.value.some((failure) => failure.code === CHECK_CODES.SYNTAX)) {
    return
  }

  props.composer.mergeLocaleMessage(
    props.language,
    nestMessage({ path: props.text.key.path, value: next }),
  )
}

function restore() {
  if (base === undefined) {
    props.composer.setLocaleMessage(
      props.language,
      withoutPath({
        messages: props.composer.getLocaleMessage(props.language),
        path: props.text.key.path,
      }) as Parameters<Composer['setLocaleMessage']>[1],
    )
  } else {
    props.composer.mergeLocaleMessage(
      props.language,
      nestMessage({ path: props.text.key.path, value: base }),
    )
  }
}

const position = computed(() => {
  const space = props.drawerOpen ? WIDGET_LAYOUT.DRAWER_SPACE : 0
  const maxLeft = window.innerWidth - space - WIDGET_LAYOUT.EDITOR_WIDTH - WIDGET_LAYOUT.EDGE

  if (!props.anchor) {
    return { left: `${Math.max(maxLeft, WIDGET_LAYOUT.EDGE)}px`, top: '80px' }
  }

  const below = props.anchor.bottom + WIDGET_LAYOUT.EDITOR_GAP
  const fits = below + height.value + WIDGET_LAYOUT.EDGE <= window.innerHeight
  const top = fits ? below : props.anchor.top - WIDGET_LAYOUT.EDITOR_GAP - height.value

  return {
    left: `${Math.max(WIDGET_LAYOUT.EDGE, Math.min(props.anchor.left, maxLeft))}px`,
    top: `${Math.max(WIDGET_LAYOUT.EDGE, top)}px`,
  }
})

async function save() {
  busy.value = true
  status.value = ''

  try {
    draft.value = await props.client.drafts.save({
      projectId: props.projectId,
      textId: props.text.id,
      language: props.language,
      value: value.value,
    })
    savedValue.value = value.value
    status.value = 'Draft saved'
    emit('saved')

    return draft.value
  } catch (error) {
    status.value = error instanceof Error ? error.message : 'Glot cannot be reached'

    return null
  } finally {
    busy.value = false
  }
}

async function send() {
  const saved = await save()

  if (!saved) {
    return
  }

  busy.value = true

  try {
    draft.value = await props.client.drafts.send({ projectId: props.projectId, draftId: saved.id })
    status.value = 'Sent for review'
    emit('saved')
  } catch (error) {
    status.value = error instanceof Error ? error.message : 'Glot cannot be reached'
  } finally {
    busy.value = false
  }
}

watch(value, preview)

watch(box, (element) => {
  height.value = element?.offsetHeight ?? 0
})

onBeforeUnmount(() => {
  if (!draft.value) {
    restore()
  }
})
</script>

<template>
  <div
    ref="box"
    class="pop w-edit glot-w"
    :style="{ position: 'fixed', ...position }"
    data-glot="editor"
    role="dialog"
    :aria-label="textKey"
    @keydown.esc.stop="emit('close')"
  >
    <div class="pop-h">
      <span :class="['lc', TEXT_STATE_CLASSES[state]]">{{ language }}</span>
      <GlotKey :value="textKey" />
      <span :class="['pill', TEXT_STATE_CLASSES[state]]"
        ><GlotIcon :name="STATE_ICONS[state]" />{{ TEXT_STATE_LABELS[state] }}</span
      >
      <span class="grow" />
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-icon"
        aria-label="Close"
        @click="emit('close')"
      >
        <GlotIcon name="x" />
      </button>
    </div>
    <label
      class="input is-focus"
      :style="{ marginTop: '12px', height: 'auto', minHeight: 'var(--ctl-h)' }"
    >
      <GlotMessageInput v-model="value" />
    </label>
    <div v-for="failure in failures" :key="failure.code" class="check-fail">
      <GlotIcon name="book-open-text" />
      <div>
        <b>{{ failure.message }}</b>
      </div>
    </div>
    <div class="row-flex" :style="{ marginTop: '12px' }">
      <span class="muted" :style="{ fontSize: '12px' }" data-glot="editor-status">{{
        status || (canWrite ? 'Only you see this draft here' : 'You cannot change this language')
      }}</span>
      <span class="grow" />
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="busy || !canWrite || !value"
        @click="save"
      >
        Save draft
      </button>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="busy || !canWrite || !value"
        @click="send"
      >
        Send for review
      </button>
    </div>
  </div>
</template>
