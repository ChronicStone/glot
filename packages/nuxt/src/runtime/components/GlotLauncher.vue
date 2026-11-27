<script setup lang="ts">
import GlotMark from '@glot/ui/components/GlotMark.vue'

defineProps<{ language: string; fix: number; check: number; status: string }>()

defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="w-launch glot-w" data-glot="launcher" @click="$emit('open')">
    <span class="mark"><GlotMark /></span>Glot
    <span class="n">
      <template v-if="status">{{ status }}</template>
      <template v-else>
        <span class="mono">{{ language }}</span>· {{ fix }} to fix · {{ check }} to check
      </template>
    </span>
  </button>
</template>
