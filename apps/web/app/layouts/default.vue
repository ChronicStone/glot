<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
const route = useRoute()
const paletteOpen = ref<boolean>(false)

defineShortcuts({
  meta_k: () => {
    paletteOpen.value = !paletteOpen.value
  },
})

const workspaceLinks: NavigationMenuItem[] = [
  { label: 'Home', icon: 'i-lucide-house', to: '/' },
  { label: 'Glossary', icon: 'i-lucide-book-open-text', to: '/glossary' },
]

const settingsLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Settings',
    icon: 'i-lucide-settings-2',
    to: '/settings',
    active: route.path.startsWith('/settings'),
  },
])
</script>

<template>
  <UDashboardGroup unit="px">
    <UDashboardSidebar :default-size="248" :resizable="false">
      <template #header>
        <div class="flex w-full flex-col gap-1.5">
          <AppWorkspaceMenu />
          <button
            type="button"
            class="mb-2.5 flex h-[34px] w-full items-center gap-2.5 rounded-[10px] bg-panel/55 pr-2 pl-2.5 text-[13px] text-ink-3 ring-1 ring-line-2 transition-colors ring-inset hover:bg-panel hover:ring-line-3"
            @click="paletteOpen = true"
          >
            <UIcon name="i-lucide-search" class="size-3.5" />
            Search or jump to…
            <UKbd value="⌘K" class="ml-auto" />
          </button>
        </div>
      </template>

      <UNavigationMenu :items="workspaceLinks" orientation="vertical" />
      <AppProjectGroups />

      <template #footer>
        <UNavigationMenu :items="settingsLinks" orientation="vertical" />
        <AppPersonMenu />
      </template>
    </UDashboardSidebar>

    <slot />
    <AppCommandPalette v-model:open="paletteOpen" />
  </UDashboardGroup>
</template>
