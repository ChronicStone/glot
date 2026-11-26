<script setup lang="ts">
import { messageSegments } from '@glot/checks'
import { computed } from 'vue'

const { value } = defineProps<{ value: string }>()
const segments = computed(() => messageSegments(value))
</script>

<template>
  <span>
    <template v-for="(segment, index) in segments" :key="index">
      <span v-if="segment.placeholder" class="ph">{{ segment.value }}</span>
      <template v-else>{{ segment.value }}</template>
    </template>
  </span>
</template>
