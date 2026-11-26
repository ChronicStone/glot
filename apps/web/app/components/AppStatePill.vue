<script setup lang="ts">
import type { TextState } from '@glot/database/types/texts'
import { TEXT_STATE_CLASSES, TEXT_STATE_ICONS, TEXT_STATE_LABELS } from '@glot/ui/constants'

defineProps<{ state: TextState; large?: boolean }>()
</script>

<template>
  <span :class="[TEXT_STATE_CLASSES[state], { 'pill-lg': large }]" class="pill">
    <UIcon :name="TEXT_STATE_ICONS[state]" />{{ TEXT_STATE_LABELS[state] }}
  </span>
</template>
