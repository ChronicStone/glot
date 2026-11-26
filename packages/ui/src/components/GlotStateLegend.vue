<script setup lang="ts">
import { TEXT_STATE_LABELS, TEXT_STATE_TONES } from '../constants/ui.constants.ts'
</script>

<template>
  <ul class="flex items-center gap-3 text-[11.5px] text-ink-3">
    <li v-for="(label, state) in TEXT_STATE_LABELS" :key="state" class="flex items-center gap-1.5">
      <span :class="TEXT_STATE_TONES[state]" class="size-2.5 rounded-[3px]" />
      {{ label }}
    </li>
  </ul>
</template>
