<script setup lang="ts">
import type { Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotStateStrip from '@glot/ui/components/GlotStateStrip.vue'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { TEXT_LIST } from '../constants/texts.constants.ts'

const { items, hasMore } = defineProps<{
  items: Text[]
  selectedId?: string | undefined
  hasMore: boolean
  loading: boolean
}>()

const emit = defineEmits<{ select: [textId: string]; more: [] }>()
const scroller = useTemplateRef<HTMLElement>('scroller')
const hovered = ref<{ text: Text; language: string; element: HTMLElement } | undefined>()

function note(text: Text) {
  const failing = text.translations.find(({ failures }) => failures.length > 0)

  if (failing?.failures[0]) {
    return {
      tone: 'bad',
      icon: 'i-lucide-triangle-alert',
      label: `${failing.failures[0].message} · ${failing.language}`,
    }
  }

  const ai = text.translations
    .filter(({ aiWritten, state }) => aiWritten && state !== TEXT_STATES.REVIEWED)
    .map(({ language }) => language)

  return ai.length > 0
    ? { tone: 'ai', icon: 'i-lucide-sparkle', label: `AI in ${ai.join(', ')}` }
    : undefined
}

const virtualizer = useVirtualizer(
  computed(() => ({
    count: items.length,
    getScrollElement: () => scroller.value,
    estimateSize: () => TEXT_LIST.ROW_HEIGHT,
    overscan: 12,
  })),
)

const visible = computed(() => {
  const rows = virtualizer.value.getVirtualItems()
  const first = rows[0]
  const last = rows.at(-1)

  return {
    before: first?.start ?? 0,
    after: last ? virtualizer.value.getTotalSize() - last.end : 0,
    rows: rows.flatMap((row) => {
      const text = items[row.index]

      return text ? [{ index: row.index, text, hint: note(text) }] : []
    }),
  }
})

watch(visible, ({ rows }) => {
  if (hasMore && (rows.at(-1)?.index ?? 0) >= items.length - 20) {
    emit('more')
  }
})

const hoveredTranslation = computed(() =>
  hovered.value?.text.translations.find(({ language }) => language === hovered.value?.language),
)

function hover(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : undefined
  const chip = target?.closest<HTMLElement>('[data-language]')
  const id = chip?.closest<HTMLElement>('[data-id]')?.dataset.id
  const text = items.find((item) => item.id === id)

  hovered.value =
    chip && text ? { text, language: chip.dataset.language ?? '', element: chip } : undefined
}

defineExpose({
  scrollTo: (index: number) => virtualizer.value.scrollToIndex(index, { align: 'auto' }),
})
</script>

<template>
  <div ref="scroller" class="tx-scroll" @mouseover="hover" @mouseleave="hovered = undefined">
    <template v-if="loading && items.length === 0">
      <div v-for="width in [62, 48, 70, 40, 56, 66, 44, 58, 50, 64]" :key="width" class="tx-row">
        <div>
          <div class="sk" :style="{ height: '12px', width: `${width}%` }" />
          <div class="sk" :style="{ height: '9px', width: `${width * 0.6}%`, marginTop: '8px' }" />
        </div>
        <div class="row-flex" style="gap: 3px">
          <span
            v-for="cell in 4"
            :key="cell"
            class="sk"
            style="width: 31px; height: 22px; border-radius: 7px"
          />
        </div>
      </div>
    </template>
    <slot v-else-if="items.length === 0" name="empty" />
    <div :style="{ height: `${visible.before}px` }" />
    <div
      v-for="{ text, hint } in visible.rows"
      :key="text.id"
      :data-id="text.id"
      :class="{ on: text.id === selectedId }"
      class="tx-row"
      role="button"
      tabindex="-1"
      @click="emit('select', text.id)"
    >
      <div style="min-width: 0">
        <div class="fr"><GlotTextValue :value="text.source.value" :syntax="text.syntax" /></div>
        <div class="sub">
          <span class="key">{{ text.key.path.join('.') }}</span><span class="faint">·</span
          ><span>{{ text.key.source }}</span>
          <template v-if="text.shownIn.length > 0"
            ><span class="faint">·</span
            ><span>{{
              text.shownIn.length === 1 ? text.shownIn[0] : `${text.shownIn.length} apps`
            }}</span></template
          >
          <template v-if="hint"
            ><span class="faint">·</span
            ><span :class="hint.tone"><UIcon :name="hint.icon" />{{ hint.label }}</span></template
          >
        </div>
      </div>
      <div><GlotStateStrip :translations="text.translations" /></div>
    </div>
    <div :style="{ height: `${visible.after}px` }" />
    <UPopover
      :open="Boolean(hoveredTranslation)"
      :reference="hovered?.element"
      :content="{ side: 'bottom', sideOffset: 8, align: 'center' }"
      :ui="{ content: 'pop hovercard' }"
    >
      <template #content>
        <template v-if="hoveredTranslation">
          <div class="pop-h">
            <span :class="TEXT_STATE_CLASSES[hoveredTranslation.state]" class="lc">{{
              hoveredTranslation.language
            }}</span>
            <span v-if="hoveredTranslation.value" class="ellipsis"
              ><GlotTextValue :value="hoveredTranslation.value" :syntax="hovered?.text.syntax"
            /></span>
            <span v-else class="muted">Not written yet</span>
          </div>
          <div class="pop-b">
            <template v-for="failure in hoveredTranslation.failures" :key="failure.code"
              >{{ failure.message }}
            </template>
            <template v-if="hoveredTranslation.failures.length === 0">
              {{
                hoveredTranslation.reviewerName
                  ? `Approved by ${hoveredTranslation.reviewerName}${hoveredTranslation.selfApproved ? ', self-approved' : ''}.`
                  : hoveredTranslation.aiWritten
                    ? 'Written by AI. Nobody has checked it yet.'
                    : 'Nobody has approved it yet.'
              }}
            </template>
          </div>
          <div class="pop-f">
            <span class="key">{{ hovered?.text.key.path.join('.') }}</span>
            <span>{{ languageName(hoveredTranslation.language) }}</span>
          </div>
        </template>
      </template>
    </UPopover>
  </div>
</template>
