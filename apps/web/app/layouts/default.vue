<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import {
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const route = useRoute()
const { projects, project } = useCurrentProject()
const reviewTotal = useReviewTotal()
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

const projectLinks = computed<NavigationMenuItem[]>(() => [
  { label: 'Projects', type: 'label' },
  ...projects.value.map((item) => ({
    label: item.name,
    icon: 'i-lucide-layers',
    defaultOpen: item.id === project.value?.id,
    ...(item.id === project.value?.id ? { ui: { linkLeadingIcon: 'text-sel-ink' } } : {}),
    children: Object.values(PROJECT_SECTIONS).map((section) => ({
      label: PROJECT_SECTION_LABELS[section],
      icon: PROJECT_SECTION_ICONS[section],
      to: `/projects/${item.id}/${section}`,
      ...(section === PROJECT_SECTIONS.REVIEW && item.id === project.value?.id && reviewTotal.value
        ? { badge: reviewTotal.value }
        : {}),
    })),
  })),
])

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
            <UKbd value="meta" class="ml-auto" /><UKbd value="K" class="-ml-1.5" />
          </button>
        </div>
      </template>

      <UNavigationMenu :items="workspaceLinks" orientation="vertical" />
      <UNavigationMenu
        :key="project?.id ?? 'none'"
        :items="projectLinks"
        orientation="vertical"
        class="mt-3.5"
        :ui="{
          label: 'h-7 px-2.5 pt-1 text-xs font-medium text-ink-3',
          childList: 'ms-[13px] mt-px mb-1 border-s border-line-2',
          childItem: 'ps-2 -ms-px',
          link: 'h-8',
        }"
      />

      <template #footer>
        <UNavigationMenu :items="settingsLinks" orientation="vertical" />
        <AppPersonMenu />
      </template>
    </UDashboardSidebar>

    <slot />
    <AppCommandPalette v-model:open="paletteOpen" />
  </UDashboardGroup>
</template>
