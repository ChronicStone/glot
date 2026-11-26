<script setup lang="ts">
import { ChevronsUpDownIcon } from '@lucide/vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui-sdk/vue/select'
import { PROJECT_SECTIONS } from '../constants/shell.constants.ts'

const { projects, project } = useCurrentProject()
const route = useRoute()

function open(projectId: string | null) {
  if (!projectId) {
    return
  }

  const section = route.path.split('/')[3] ?? PROJECT_SECTIONS.TEXTS

  return navigateTo(`/projects/${projectId}/${section}`)
}
</script>

<template>
  <Select
    v-if="project"
    :value="project.id"
    :items="projects.data.value?.map(({ id, name }) => ({ value: id, label: name })) ?? []"
    @update:value="open"
  >
    <SelectTrigger
      aria-label="Project"
      class="mt-3 mb-1 flex h-11 w-full items-center gap-2.5 rounded-card border border-line-strong bg-surface/60 px-3 text-left font-semibold outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent-line"
    >
      <span class="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <SelectValue class="min-w-0 flex-1 truncate" />
      <ChevronsUpDownIcon class="size-3.5 shrink-0 text-ink-3" aria-hidden="true" />
    </SelectTrigger>
    <SelectContent
      class="z-50 min-w-(--anchor-width) rounded-card bg-surface p-1 shadow-pop outline-none"
    >
      <SelectItem
        v-for="item in projects.data.value"
        :key="item.id"
        :value="item.id"
        class="flex h-9 cursor-default items-center rounded-control px-3 outline-none data-highlighted:bg-sunken data-selected:font-semibold"
      >
        {{ item.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
