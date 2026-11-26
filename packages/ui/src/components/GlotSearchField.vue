<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { ref } from 'vue'

const words = defineModel<string>({ required: true })
const field = ref<HTMLInputElement | null>(null)

defineProps<{ placeholder: string; shortcut?: string }>()

defineExpose({ focus: () => field.value?.focus() })
</script>

<template>
  <label
    class="flex h-9 min-w-0 items-center gap-2 rounded-control bg-sunken px-3 text-ink-3 focus-within:ring-2 focus-within:ring-accent-line"
  >
    <SearchIcon class="size-4 shrink-0" aria-hidden="true" />
    <input
      ref="field"
      v-model="words"
      type="search"
      :placeholder="placeholder"
      :aria-keyshortcuts="shortcut"
      class="h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
    />
    <kbd
      v-if="shortcut"
      class="hidden rounded-md border border-line-strong bg-surface px-1.5 font-mono text-[11px] text-ink-3 md:inline"
      >{{ shortcut }}</kbd
    >
  </label>
</template>
