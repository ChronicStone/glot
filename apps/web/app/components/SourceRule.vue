<script setup lang="ts">
const { pathPattern } = defineProps<{ pathPattern: string; large?: boolean }>()

const shape = computed(() => sourceShape(pathPattern))
</script>

<template>
  <span :class="{ lg: large }" class="rule">
    <template v-for="segment in shape.segments" :key="segment"
      ><span class="seg-p">{{ segment }}</span><span class="sl">/</span></template
    ><span class="var"><UIcon name="i-lucide-languages" />language</span
    ><span class="seg-p">{{ shape.suffix }}</span>
  </span>
</template>
