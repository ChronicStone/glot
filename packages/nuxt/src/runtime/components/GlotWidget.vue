<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ref } from 'vue'

const { seen } = defineProps<{ seen: Ref<Map<string, string>> }>()
const open = ref<boolean>(false)
const texts = computed(() => [...seen.value.entries()])
</script>

<template>
  <div class="fixed right-3 bottom-3 z-[2147483647] flex flex-col items-end gap-2 text-ink">
    <section
      v-if="open"
      class="flex max-h-[60vh] w-[380px] flex-col overflow-hidden rounded-panel bg-panel shadow-pop"
    >
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <b class="text-sm font-semibold">On this page</b>
        <span class="text-xs text-ink-3">{{ texts.length }} texts</span>
      </header>
      <ul class="overflow-auto p-2">
        <li v-for="[key, text] in texts" :key="key" class="rounded-xl px-2.5 py-2 hover:bg-sunken">
          <p class="text-[13px]">{{ text }}</p>
          <p class="font-mono text-[11px] text-ink-3">{{ key }}</p>
        </li>
      </ul>
    </section>
    <button
      class="flex items-center gap-2.5 rounded-full [background:var(--glot-primary-fill)] py-2 pr-2 pl-3.5 text-[13px] font-medium text-on-primary shadow-pop"
      @click="open = !open"
    >
      Glot
      <span class="rounded-full bg-white/15 px-2.5 py-1">{{ texts.length }} on this page</span>
    </button>
  </div>
</template>
