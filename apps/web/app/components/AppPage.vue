<script setup lang="ts">
defineProps<{ title: string; scroll?: boolean; context?: string | undefined }>()

const openMenu = inject<() => void>('openMenu', () => undefined)
const openPalette = inject<() => void>('openPalette', () => undefined)
</script>

<template>
  <div :class="{ 'page-scroll': scroll }" class="page">
    <div class="m-top">
      <slot name="mobile">
        <button
          type="button"
          class="btn btn-ghost btn-icon btn-sm"
          aria-label="Menu"
          @click="openMenu"
        >
          <UIcon name="i-lucide-menu" /></button
        ><b>{{ context ?? title }}</b><span class="g-grow" /><button
          type="button"
          class="btn btn-ghost btn-icon btn-sm"
          aria-label="Search"
          @click="openPalette"
        >
          <UIcon name="i-lucide-search" />
        </button>
      </slot>
    </div>
    <div v-if="$slots.crumb" class="crumb"><slot name="crumb" /></div>
    <div class="ph-row">
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
