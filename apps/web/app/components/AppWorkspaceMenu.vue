<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import GlotMark from '@glot/ui/components/GlotMark.vue'

const { $auth } = useNuxtApp()
const { workspaces, workspace } = useCurrentWorkspace()

const items = computed<DropdownMenuItem[][]>(() => [
  [
    { type: 'label', label: 'Workspaces' },
    ...(workspaces.value.data ?? []).map(({ id, name }) => ({
      label: name,
      type: 'checkbox' as const,
      checked: id === workspace.value?.id,
      onSelect: () => $auth.organization.setActive({ organizationId: id }),
    })),
  ],
  [{ label: 'Workspace settings', icon: 'i-lucide-settings-2', to: '/settings/people' }],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start', sideOffset: 4 }"
    :ui="{ content: 'pop menu w-[248px]' }"
  >
    <button type="button" class="ws">
      <span class="mark"><GlotMark /></span>
      <span><div class="name">{{ workspace?.name ?? 'Glot' }}</div></span>
      <UIcon name="i-lucide-chevrons-up-down" />
    </button>
  </UDropdownMenu>
</template>
