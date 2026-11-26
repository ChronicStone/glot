<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ to: string; icon: Component; label: string; count?: number }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex h-9 items-center gap-2.5 rounded-control px-2.5 font-medium text-ink-2 no-underline transition-colors hover:text-ink [&.router-link-active]:bg-surface [&.router-link-active]:text-ink [&.router-link-active]:shadow-card"
  >
    <component :is="icon" class="size-4 shrink-0" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate">{{ label }}</span>
    <span v-if="count" class="text-xs text-ink-3 tabular-nums">{{ count }}</span>
  </NuxtLink>
</template>
