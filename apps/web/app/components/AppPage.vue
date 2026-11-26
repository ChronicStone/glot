<script setup lang="ts">
defineProps<{ id: string; title: string; fill?: boolean }>()
</script>

<template>
  <UDashboardPanel :id="id" :ui="{ body: fill ? 'overflow-hidden' : '' }">
    <template #body>
      <div
        :class="fill ? 'h-full min-h-0' : 'min-h-full'"
        class="flex flex-col px-3 pt-[18px] pb-5 lg:pr-5 lg:pl-2"
      >
        <header class="flex flex-wrap items-center gap-3.5 px-2 pt-2.5">
          <UDashboardSidebarToggle variant="ghost" class="-ml-2 lg:hidden" />
          <h1 class="text-title whitespace-nowrap text-ink">{{ title }}</h1>
          <slot name="pill" />
          <div class="ml-auto flex items-center gap-2">
            <slot name="actions" />
          </div>
        </header>
        <div
          v-if="$slots.meta"
          class="flex flex-wrap items-center gap-x-[18px] gap-y-1 px-2 pt-2 text-[13px] text-ink-3"
        >
          <slot name="meta" />
        </div>
        <div class="h-[22px] shrink-0" />
        <slot />
      </div>
    </template>
  </UDashboardPanel>
</template>
