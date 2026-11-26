<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import {
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const { project } = useCurrentProject()

const workspaceLinks: NavigationMenuItem[] = [
  { label: 'Home', icon: 'i-lucide-house', to: '/' },
  { label: 'Glossary', icon: 'i-lucide-book-open', to: '/glossary' },
]

const projectLinks = computed<NavigationMenuItem[]>(() =>
  project.value
    ? Object.values(PROJECT_SECTIONS).map((section) => ({
        label: PROJECT_SECTION_LABELS[section],
        icon: PROJECT_SECTION_ICONS[section],
        to: `/projects/${project.value?.id}/${section}`,
      }))
    : [],
)

const settingsLinks: NavigationMenuItem[] = [
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
]
</script>

<template>
  <UDashboardGroup unit="px">
    <UDashboardSidebar
      :default-size="248"
      :ui="{ header: 'h-auto pt-4 pb-2', body: 'gap-1', footer: 'flex-col items-stretch gap-1' }"
    >
      <template #header>
        <AppWorkspaceMenu />
      </template>

      <UNavigationMenu :items="workspaceLinks" orientation="vertical" />
      <AppProjectSwitcher />
      <UNavigationMenu :items="projectLinks" orientation="vertical" />

      <template #footer>
        <UNavigationMenu :items="settingsLinks" orientation="vertical" />
        <AppPersonMenu />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
