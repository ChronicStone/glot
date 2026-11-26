<script setup lang="ts">
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '../constants/ui.constants.ts'

defineProps<{ language: string }>()
</script>

<template>
  <div class="legend chiplegend">
    <span v-for="(label, state) in TEXT_STATE_LABELS" :key="state"
      ><span :class="TEXT_STATE_CLASSES[state]" class="lc">{{ language }}</span>{{ label }}</span
    >
    <span><i class="aidot" />AI</span>
  </div>
</template>
