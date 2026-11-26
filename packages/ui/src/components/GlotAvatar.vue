<script setup lang="ts">
const { name } = defineProps<{ name: string }>()
</script>

<template>
  <span
    class="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent uppercase"
    aria-hidden="true"
    >{{ name.slice(0, 1) }}</span
  >
</template>
