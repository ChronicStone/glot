<script setup lang="ts">
defineProps<{ title: string; detail?: string | undefined }>()
</script>

<template>
  <header class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 pb-3 md:px-6 md:pt-[18px]">
    <h1 class="text-[19px] font-semibold tracking-tight">{{ title }}</h1>
    <span v-if="detail" class="text-ink-3">{{ detail }}</span>
    <span class="flex-1" />
    <slot />
  </header>
</template>
