<script setup lang="ts">
import { PROJECT_SECTIONS } from '../constants/shell.constants.ts'

const { projects, project } = useCurrentProject()
const route = useRoute()

const items = computed(() => projects.value.map(({ id, name }) => ({ value: id, label: name })))

function open(projectId: string) {
  const section = route.path.split('/')[3] ?? PROJECT_SECTIONS.TEXTS

  return navigateTo(`/projects/${projectId}/${section}`)
}
</script>

<template>
  <USelect
    v-if="project"
    :model-value="project.id"
    :items="items"
    aria-label="Project"
    icon="i-lucide-circle-dot"
    size="lg"
    class="my-2 w-full"
    :ui="{ leadingIcon: 'text-primary size-3.5' }"
    @update:model-value="open"
  />
</template>
