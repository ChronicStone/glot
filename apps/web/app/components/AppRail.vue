<script setup lang="ts">
import {
  BookOpenIcon,
  FileTextIcon,
  HouseIcon,
  MailIcon,
  RocketIcon,
  SettingsIcon,
} from '@lucide/vue'
import { PROJECT_SECTIONS, PROJECT_SECTION_LABELS } from '../constants/shell.constants.ts'

const { $auth } = useNuxtApp()
const workspaces = $auth.useListOrganizations()
const session = $auth.useSession()
const { project } = useCurrentProject()

const workspace = computed(
  () =>
    workspaces.value.data?.find(
      ({ id }) => id === session.value.data?.session.activeOrganizationId,
    ) ?? workspaces.value.data?.[0],
)

const sectionIcons = {
  [PROJECT_SECTIONS.TEXTS]: FileTextIcon,
  [PROJECT_SECTIONS.EMAILS]: MailIcon,
  [PROJECT_SECTIONS.RELEASES]: RocketIcon,
}
</script>

<template>
  <nav aria-label="Workspace" class="flex h-full flex-col gap-0.5 px-3 py-[18px]">
    <div class="flex items-center gap-2.5 px-1.5 pb-5">
      <span
        class="grid size-8 place-items-center rounded-[10px] bg-ink text-[14px] font-semibold text-bg"
        aria-hidden="true"
        >g</span
      >
      <span class="min-w-0 leading-tight">
        <span class="block truncate text-[14px] font-semibold">{{
          workspace?.name ?? 'Glot'
        }}</span>
        <span class="block text-xs text-ink-3">Glot</span>
      </span>
    </div>
    <AppNavLink to="/" :icon="HouseIcon" label="Home" />
    <AppNavLink to="/glossary" :icon="BookOpenIcon" label="Glossary" />
    <AppProjectSwitcher />
    <template v-if="project">
      <AppNavLink
        v-for="(label, section) in PROJECT_SECTION_LABELS"
        :key="section"
        :to="`/projects/${project.id}/${section}`"
        :icon="sectionIcons[section]"
        :label="label"
      />
    </template>
    <span class="flex-1" />
    <AppNavLink to="/settings" :icon="SettingsIcon" label="Settings" />
    <AppPersonMenu />
  </nav>
</template>
