<script setup lang="ts">
import type { Translation } from '@glot/contract'
import { TEXT_STATE_LABELS, TEXT_STATE_TONES } from '../constants/ui.constants.ts'

defineProps<{ translations: Translation[] }>()
</script>

<template>
  <ul class="flex gap-[3px]">
    <li
      v-for="translation in translations"
      :key="translation.language"
      :title="`${translation.language} · ${TEXT_STATE_LABELS[translation.state]}`"
      :class="TEXT_STATE_TONES[translation.state]"
      class="grid h-5 w-6 place-items-center rounded-md font-mono text-[10px] font-semibold"
    >
      {{ translation.language }}
    </li>
  </ul>
</template>
