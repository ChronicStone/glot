<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import { TEXT_STATE_LABELS } from '@glot/ui/constants'
import type { TextState } from '@glot/database/types/texts'
import GlotStateLegend from '@glot/ui/components/GlotStateLegend.vue'
import GlotStateStrip from '@glot/ui/components/GlotStateStrip.vue'
import { useQuery } from '@tanstack/vue-query'

const { $api } = useNuxtApp()
const words = ref<string>('')
const state = ref<TextState | undefined>(undefined)
const projects = useQuery($api.projects.list.queryOptions())
const projectId = computed(() => projects.data.value?.[0]?.id)

const texts = useQuery(
  computed(() => ({
    ...$api.texts.search.queryOptions({
      input: { projectId: projectId.value ?? '', q: words.value || undefined, state: state.value },
    }),
    enabled: Boolean(projectId.value),
  })),
)

const filters = [
  { label: 'All', value: undefined },
  { label: TEXT_STATE_LABELS.NEEDS_FIX, value: TEXT_STATES.NEEDS_FIX },
  { label: TEXT_STATE_LABELS.TO_CHECK, value: TEXT_STATES.TO_CHECK },
]
</script>

<template>
  <header class="flex items-center gap-3 px-6 pt-[18px] pb-3.5">
    <h1 class="text-[19px] font-semibold tracking-tight">Texts</h1>
    <span class="text-ink-3"
      >{{ texts.data.value?.total ?? 0 }} in {{ projects.data.value?.[0]?.name }}</span
    >
    <span class="flex-1" />
    <input
      v-model="words"
      placeholder="Search any language"
      class="h-9 w-[260px] rounded-control bg-sunken px-3 outline-none focus:ring-2 focus:ring-accent-line"
    />
  </header>
  <nav class="flex items-center gap-1.5 px-6 pb-3">
    <button
      v-for="filter in filters"
      :key="filter.label"
      :data-active="state === filter.value"
      class="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2 data-[active=true]:bg-accent-soft data-[active=true]:text-accent data-[active=true]:ring-1 data-[active=true]:ring-accent-line data-[active=true]:ring-inset"
      @click="state = filter.value"
    >
      {{ filter.label }}
    </button>
    <span class="flex-1" />
    <GlotStateLegend />
  </nav>
  <ul class="min-h-0 flex-1 overflow-auto border-t border-line">
    <li
      v-for="text in texts.data.value?.items"
      :key="text.id"
      class="grid grid-cols-[1fr_120px_auto] items-center gap-4 border-b border-line px-6 py-[11px]"
    >
      <div class="min-w-0">
        <p class="truncate text-[13.5px]">{{ text.source.value }}</p>
        <p class="truncate text-xs text-ink-3">{{ text.where }}</p>
      </div>
      <span class="text-xs text-ink-2">{{ text.shownIn.join(', ') }}</span>
      <GlotStateStrip :translations="text.translations" />
    </li>
  </ul>
</template>
