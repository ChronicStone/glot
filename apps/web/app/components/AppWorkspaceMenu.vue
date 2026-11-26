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
  <UDropdownMenu :items="items" :content="{ align: 'start' }" :ui="{ content: 'w-[248px]' }">
    <button
      type="button"
      class="flex h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left transition-colors hover:bg-hover-page"
    >
      <span
        class="grid size-7 shrink-0 place-items-center rounded-[9px] text-on-primary shadow-primary [background:var(--glot-primary-fill)]"
      >
        <GlotMark class="size-4" />
      </span>
      <span class="min-w-0 flex-1 truncate font-semibold tracking-[-0.012em] text-ink">{{
        workspace?.name ?? 'Glot'
      }}</span>
      <UIcon name="i-lucide-chevrons-up-down" class="size-[15px] shrink-0 text-ink-4" />
    </button>
  </UDropdownMenu>
</template>
