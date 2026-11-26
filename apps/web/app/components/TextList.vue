<script setup lang="ts">
import type { Text } from '@glot/contract'
import GlotStateStrip from '@glot/ui/components/GlotStateStrip.vue'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { useVirtualizer } from '@tanstack/vue-virtual'

const { items, sourceLanguage, languages, hasMore } = defineProps<{
  items: Text[]
  sourceLanguage: string
  languages: string[]
  selectedId?: string | undefined
  hasMore: boolean
}>()

const emit = defineEmits<{ select: [textId: string]; more: [] }>()
const scroller = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer(
  computed(() => ({
    count: items.length,
    getScrollElement: () => scroller.value,
    estimateSize: () => 64,
    overscan: 10,
  })),
)

const rows = computed(() =>
  virtualizer.value.getVirtualItems().flatMap((row) => {
    const text = items[row.index]

    return text ? [{ index: row.index, start: row.start, text }] : []
  }),
)

watch(rows, (visible) => {
  if (hasMore && (visible.at(-1)?.index ?? 0) >= items.length - 10) {
    emit('more')
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      class="grid grid-cols-[1fr_auto] gap-4 border-y border-line px-4 py-2.5 text-xs text-ink-3 md:grid-cols-[1fr_96px_auto] md:px-6"
    >
      <span>{{ languageName(sourceLanguage) }} · most seen first</span>
      <span class="hidden md:block">Shown in</span>
      <span class="font-mono">{{ languages.join(' ') }}</span>
    </div>
    <div ref="scroller" class="min-h-0 flex-1 overflow-auto">
      <p v-if="items.length === 0" class="px-4 py-10 text-center text-ink-3 md:px-6">
        No text matches.
      </p>
      <ul class="relative" :style="{ height: `${virtualizer.getTotalSize()}px` }">
        <li
          v-for="{ text, start } in rows"
          :key="text.id"
          class="absolute inset-x-0 top-0"
          :style="{ transform: `translateY(${start}px)` }"
        >
          <button
            type="button"
            :aria-current="text.id === selectedId"
            class="grid h-16 w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-4 text-left hover:bg-sunken/70 aria-[current=true]:bg-accent-soft aria-[current=true]:shadow-[inset_3px_0_0_var(--glot-accent)] md:grid-cols-[1fr_96px_auto] md:px-6"
            @click="emit('select', text.id)"
          >
            <span class="min-w-0">
              <GlotTextValue :value="text.source.value" class="block truncate text-[13.5px]" />
              <span class="block truncate text-xs text-ink-3">{{ text.where }}</span>
            </span>
            <span class="hidden truncate text-xs text-ink-2 md:block">{{
              text.shownIn.length === 1 ? text.shownIn[0] : `${text.shownIn.length} apps`
            }}</span>
            <GlotStateStrip :translations="text.translations" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
