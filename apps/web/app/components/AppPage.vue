<script setup lang="ts">
defineProps<{ id: string; title: string; detail?: string | undefined }>()
</script>

<template>
  <UDashboardPanel :id="id">
    <template #header>
      <UDashboardNavbar
        :title="title"
        :ui="{ root: 'border-b-0 h-auto pt-4 pb-2', title: 'text-[19px] tracking-tight' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse class="lg:hidden" />
        </template>
        <template #trailing>
          <span v-if="detail" class="hidden text-muted sm:inline">{{ detail }}</span>
        </template>
        <template #right>
          <slot name="actions" />
        </template>
      </UDashboardNavbar>
      <slot name="toolbar" />
    </template>
    <template #body>
      <slot />
    </template>
  </UDashboardPanel>
</template>
