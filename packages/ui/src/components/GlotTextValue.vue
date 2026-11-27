<script setup lang="ts">
import type { Syntax } from '@glot/checks'
import { computed } from 'vue'
import { fieldParts } from '../utils/message-field.utils.ts'

const { value, syntax } = defineProps<{ value: string; syntax?: Syntax | undefined }>()
const parts = computed(() => fieldParts(value, syntax))
</script>

<template>
  <span>
    <template v-for="(part, index) in parts" :key="index">
      <span v-if="part.locked" :class="{ tag: part.raw.startsWith('<') }" class="ph">{{
        part.label
      }}</span>
      <template v-else>{{ part.raw }}</template>
    </template>
  </span>
</template>
