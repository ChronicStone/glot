<script setup lang="ts">
import { STATE_BADGES } from '../constants/widget.constants.ts'
import type { OutlineBox } from '../types/widget.types.ts'

defineProps<{ boxes: OutlineBox[] }>()
</script>

<template>
  <div
    v-for="box in boxes"
    :key="box.id"
    :class="['gx', box.tone]"
    :style="{
      position: 'fixed',
      left: `${box.rect.left}px`,
      top: `${box.rect.top}px`,
      width: `${box.rect.width}px`,
      height: `${box.rect.height}px`,
      pointerEvents: 'none',
    }"
    data-glot="outline"
    :data-tone="box.tone"
  >
    <span v-if="box.badge" class="gb">{{ STATE_BADGES[box.badge] }}</span>
  </div>
</template>
