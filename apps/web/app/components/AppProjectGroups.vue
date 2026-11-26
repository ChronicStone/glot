<script setup lang="ts">
import {
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const route = useRoute()
const { projects, project } = useCurrentProject()
const reviewTotal = useReviewTotal()
const closed = useLocalStorage<string[]>('glot-closed-projects', [])

function toggle(projectId: string) {
  closed.value = closed.value.includes(projectId)
    ? closed.value.filter((id) => id !== projectId)
    : [...closed.value, projectId]
}

function current(options: { projectId: string; section: string }) {
  return route.path.startsWith(`/projects/${options.projectId}/${options.section}`)
}

function isOpen(projectId: string) {
  return !closed.value.includes(projectId)
}
</script>

<template>
  <div class="mt-[18px] flex flex-col">
    <div class="flex h-7 items-center px-2.5 text-xs font-medium text-ink-3">Projects</div>
    <div v-for="item in projects" :key="item.id" class="mb-0.5 flex flex-col">
      <button
        type="button"
        :aria-expanded="isOpen(item.id)"
        :class="isOpen(item.id) ? 'font-medium text-ink' : 'font-[450] text-ink-2'"
        class="flex h-[34px] w-full items-center gap-2 rounded-[10px] pr-2.5 pl-1 text-left text-sm transition-colors hover:bg-hover-page"
        @click="toggle(item.id)"
      >
        <UIcon
          :name="isOpen(item.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5 shrink-0 text-ink-4"
        />
        <span
          :class="item.id === project?.id ? 'bg-check-bg text-check' : 'bg-tile text-ink-3'"
          class="grid size-5 shrink-0 place-items-center rounded-md"
        >
          <UIcon name="i-lucide-layers" class="size-3" />
        </span>
        <span class="min-w-0 flex-1 truncate">{{ item.name }}</span>
        <span
          v-if="!isOpen(item.id) && item.id === project?.id && reviewTotal > 0"
          class="text-xs font-medium text-check tabular-nums"
          >{{ reviewTotal }}</span
        >
      </button>
      <nav
        v-if="isOpen(item.id)"
        class="relative mt-px mb-1 flex flex-col gap-px pl-[22px] before:absolute before:top-1 before:bottom-1 before:left-[14px] before:w-px before:bg-line-2"
      >
        <NuxtLink
          v-for="section in Object.values(PROJECT_SECTIONS)"
          :key="section"
          :to="`/projects/${item.id}/${section}`"
          :class="
            current({ projectId: item.id, section })
              ? 'bg-active-page font-medium text-ink'
              : 'font-[450] text-ink-2 hover:bg-hover-page hover:text-ink'
          "
          class="flex h-8 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition-colors"
        >
          <UIcon
            :name="PROJECT_SECTION_ICONS[section]"
            :class="current({ projectId: item.id, section }) ? 'text-ink' : 'text-ink-3'"
            class="size-[15px] shrink-0"
          />
          <span class="min-w-0 flex-1 truncate">{{ PROJECT_SECTION_LABELS[section] }}</span>
          <span
            v-if="section === PROJECT_SECTIONS.REVIEW && item.id === project?.id && reviewTotal > 0"
            class="text-xs font-medium text-check tabular-nums"
            >{{ reviewTotal }}</span
          >
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
