<script setup lang="ts">
import {
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const route = useRoute()
const { projects, project } = useCurrentProject()
const reviewTotal = useReviewTotal()
const toggled = useLocalStorage<string[]>('glot-toggled-projects', [])

function toggle(projectId: string) {
  toggled.value = toggled.value.includes(projectId)
    ? toggled.value.filter((id) => id !== projectId)
    : [...toggled.value, projectId]
}

function isOpen(projectId: string) {
  return toggled.value.includes(projectId) !== (projectId === project.value?.id)
}
</script>

<template>
  <div class="side-sec">
    <span>Projects</span>
    <NuxtLink to="/settings/projects" class="btn btn-ghost btn-xs btn-icon" title="New project"
      ><UIcon name="i-lucide-plus"
    /></NuxtLink>
  </div>
  <div v-for="item in projects" :key="item.id" :class="{ open: isOpen(item.id) }" class="pgroup">
    <button type="button" class="phead" :aria-expanded="isOpen(item.id)" @click="toggle(item.id)">
      <UIcon
        :name="isOpen(item.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="tw"
      />
      <span :class="item.id === project?.id ? 'check' : 'plain'" class="pg"
        ><UIcon name="i-lucide-layers"
      /></span>
      <span class="pn">{{ item.name }}</span>
      <span v-if="!isOpen(item.id) && item.id === project?.id && reviewTotal" class="n">{{
        reviewTotal
      }}</span>
    </button>
    <nav v-if="isOpen(item.id)" class="nav sub">
      <NuxtLink
        v-for="section in Object.values(PROJECT_SECTIONS)"
        :key="section"
        :to="`/projects/${item.id}/${section}`"
        :class="{ on: route.path.startsWith(`/projects/${item.id}/${section}`) }"
        ><UIcon :name="PROJECT_SECTION_ICONS[section]" /><span class="lbl">{{
          PROJECT_SECTION_LABELS[section]
        }}</span
        ><span
          v-if="section === PROJECT_SECTIONS.REVIEW && item.id === project?.id && reviewTotal"
          class="n hot"
          >{{ reviewTotal }}</span
        ></NuxtLink
      >
    </nav>
  </div>
</template>
