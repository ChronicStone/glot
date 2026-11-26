<script setup lang="ts">
import { messageSegments } from '@glot/checks'
import { computed } from 'vue'

const { value } = defineProps<{ value: string }>()
const segments = computed(() => messageSegments(value))
</script>

<template>
  <span>
    <template v-for="(segment, index) in segments" :key="index">
      <span
        v-if="segment.placeholder"
        class="mx-px inline-block rounded-md bg-accent-soft px-1.5 py-px align-baseline text-[0.92em] text-accent"
        >{{ segment.value }}</span
      >
      <template v-else>{{ segment.value }}</template>
    </template>
  </span>
</template>
