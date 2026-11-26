<script setup lang="ts">
defineProps<{ title: string; scroll?: boolean }>()

const openMenu = inject<() => void>('openMenu', () => undefined)
</script>

<template>
  <div :class="{ 'page-scroll': scroll }" class="page">
    <div v-if="$slots.crumb" class="crumb"><slot name="crumb" /></div>
    <div class="ph-row">
      <button
        type="button"
        class="btn btn-ghost btn-icon m-only"
        aria-label="Menu"
        @click="openMenu"
      >
        <UIcon name="i-lucide-menu" />
      </button>
      <h1>{{ title }}</h1>
      <slot name="pill" />
      <div class="actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.meta" class="ph-meta"><slot name="meta" /></div>
    <div class="ph-gap" />
    <slot name="toolbar" />
    <slot />
  </div>
</template>
