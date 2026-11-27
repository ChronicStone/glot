<script setup lang="ts">
import { CHECK_CODES, checkText } from '@glot/checks'
import type { DraftView, Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { GlotClient } from '@glot/sdk'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '@glot/ui/constants'
import { useMediaQuery } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import type { Composer } from 'vue-i18n'
import { DOCK_SIDES, NARROW_SCREEN, PLURAL, WIDGET_LAYOUT } from '../constants/widget.constants.ts'
import { nestMessage, withoutPath } from '../utils/message.utils.ts'
import type { DockSide, PageHit } from '../types/widget.types.ts'
import { measureLine } from '../utils/fit.utils.ts'
import { pluralForms, pluralLabels } from '../utils/plural.utils.ts'
import { translationIn } from '../utils/text.utils.ts'
import GlotIcon from './GlotIcon.vue'
import GlotKey from './GlotKey.vue'
import GlotMessageInput from './GlotMessageInput.vue'

const props = defineProps<{
  text: Text
  textKey: string
  language: string
  anchor: DOMRect | null
  hit: PageHit | null
  drawerSide: DockSide | null
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
  checkText({
    source: props.text.source.value,
    target: value.value,
    avoid: [],
    syntax: props.text.syntax,
    language: props.language,
  }),
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

const narrow = useMediaQuery(NARROW_SCREEN)
const fit = ref<ReturnType<typeof measureLine>>(null)
const oneLine = ref<boolean>(false)

const fitOver = computed(
  () => !!fit.value && (fit.value.lines > 1 || fit.value.used > fit.value.room),
)

function remeasure() {
  requestAnimationFrame(() => {
    fit.value = props.hit
      ? measureLine({ node: props.hit.node, attribute: props.hit.attribute })
      : null
  })
}

watch([value, () => props.anchor], remeasure)

watch(
  () => props.hit,
  (hit) => {
    if (hit && !oneLine.value && !fit.value) {
      oneLine.value = measureLine({ node: hit.node, attribute: hit.attribute })?.lines === 1
      remeasure()
    }
  },
  { immediate: true },
)

const forms = computed(() => {
  const own = pluralForms(value.value)
  const wanted = pluralForms(props.text.source.value).length

  return own.length >= wanted
    ? own
    : [...own, ...Array.from({ length: wanted - own.length }, () => '')]
})

const labels = computed(() =>
  pluralLabels({
    language: props.language,
    count: forms.value.length,
    appRule: props.language in props.composer.pluralRules,
  }),
)

function setForm(options: { index: number; form: string }) {
  value.value = forms.value
    .map((form, index) => (index === options.index ? options.form : form))
    .join(PLURAL.SEPARATOR)
}

const position = computed(() => {
  if (narrow.value && props.anchor && props.anchor.top > window.innerHeight / 2) {
    return { left: '0px', right: '0px', top: '0px', width: 'auto', borderRadius: '0 0 20px 20px' }
  }

  if (narrow.value) {
    return { left: '0px', right: '0px', bottom: '0px', width: 'auto' }
  }

  const minLeft =
    props.drawerSide === DOCK_SIDES.LEFT
      ? WIDGET_LAYOUT.DRAWER_SPACE + WIDGET_LAYOUT.EDGE
      : WIDGET_LAYOUT.EDGE

  const maxLeft =
    window.innerWidth -
    (props.drawerSide === DOCK_SIDES.RIGHT ? WIDGET_LAYOUT.DRAWER_SPACE : 0) -
    WIDGET_LAYOUT.EDITOR_WIDTH -
    WIDGET_LAYOUT.EDGE

  if (!props.anchor) {
    return { left: `${Math.max(maxLeft, minLeft)}px`, top: '80px' }
  }

  const below = props.anchor.bottom + WIDGET_LAYOUT.EDITOR_GAP
  const fits = below + height.value + WIDGET_LAYOUT.EDGE <= window.innerHeight
  const top = fits ? below : props.anchor.top - WIDGET_LAYOUT.EDITOR_GAP - height.value

  return {
    left: `${Math.max(minLeft, Math.min(props.anchor.left, maxLeft))}px`,
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
    <template v-if="forms.length > 1">
      <div
        v-for="(form, index) in forms"
        :key="index"
        class="row-flex"
        :style="{ marginTop: index === 0 ? '12px' : '8px', alignItems: 'flex-start' }"
        data-glot="plural-form"
      >
        <span
          class="tag mono"
          :style="{
            width: '92px',
            flex: 'none',
            height: 'var(--glot-control-h)',
            justifyContent: 'center',
          }"
          >{{ labels[index] }}</span
        >
        <label class="input" :style="{ flex: 1, height: 'auto', minHeight: 'var(--ctl-h)' }">
          <GlotMessageInput
            :model-value="form"
            :autofocus="index === 0"
            @update:model-value="setForm({ index, form: $event })"
          />
        </label>
      </div>
    </template>
    <label
      v-else
      class="input is-focus"
      :style="{ marginTop: '12px', height: 'auto', minHeight: 'var(--ctl-h)' }"
    >
      <GlotMessageInput v-model="value" />
    </label>
    <div
      v-if="fit && oneLine"
      class="fits"
      data-glot="fits"
      :style="fitOver ? { color: 'var(--glot-fix)' } : {}"
    >
      <GlotIcon name="ruler" class="ic-13" />
      <span
        >{{ fitOver ? 'Does not fit the line' : 'Fits the line' }}: {{ fit.used }} of
        {{ fit.room }} px</span
      >
      <span class="meter"
        ><i
          :style="{
            width: `${Math.min(100, (fit.used / Math.max(fit.room, 1)) * 100)}%`,
            ...(fitOver ? { background: 'var(--glot-fix-bar)' } : {}),
          }"
      /></span>
    </div>
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
