<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { $auth } = useNuxtApp()
const { workspaces, workspace } = useCurrentWorkspace()

const items = computed<DropdownMenuItem[]>(() =>
  (workspaces.value.data ?? []).map(({ id, name }) => ({
    label: name,
    type: 'checkbox',
    checked: id === workspace.value?.id,
    onSelect: () => $auth.organization.setActive({ organizationId: id }),
  })),
)
</script>

<template>
  <UDropdownMenu :items="items" :disabled="items.length < 2" :content="{ align: 'start' }">
    <UButton
      color="neutral"
      variant="ghost"
      block
      class="justify-start gap-2.5 px-1.5 disabled:opacity-100"
      :trailing-icon="items.length > 1 ? 'i-lucide-chevrons-up-down' : undefined"
    >
      <span
        class="grid size-8 shrink-0 place-items-center rounded-[10px] bg-inverted text-[14px] font-semibold text-inverted"
        aria-hidden="true"
        >g</span
      >
      <span class="min-w-0 flex-1 text-left leading-tight">
        <span class="block truncate text-[14px] font-semibold text-highlighted">{{
          workspace?.name ?? 'Glot'
        }}</span>
        <span class="block text-xs font-normal text-muted">Glot</span>
      </span>
    </UButton>
  </UDropdownMenu>
</template>
