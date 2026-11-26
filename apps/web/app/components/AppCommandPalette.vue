<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { SETTINGS_LINKS } from '../constants/people.constants.ts'
import {
  APPEARANCES,
  APPEARANCE_ICONS,
  APPEARANCE_LABELS,
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const open = defineModel<boolean>('open', { default: false })

const { $api } = useNuxtApp()
const { project } = useCurrentProject()
const colorMode = useColorMode()
const term = ref<string>('')
const query = refDebounced(term, 200)

const texts = useQuery(() => ({
  ...$api.texts.search.queryOptions({
    input: { projectId: project.value?.id ?? '', q: query.value, limit: 6 },
  }),
  enabled: Boolean(project.value && query.value.trim().length > 1),
}))

function close() {
  open.value = false
}

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [
  {
    id: 'texts',
    label: project.value ? `Texts · ${project.value.name}` : 'Texts',
    ignoreFilter: true,
    items: (texts.data.value?.items ?? []).map((text) => ({
      label: text.source.value,
      suffix: text.where,
      icon: 'i-lucide-text',
      to: { path: `/projects/${project.value?.id}/texts`, query: { text: text.id } },
      onSelect: close,
    })),
  },
  {
    id: 'pages',
    label: 'Go to',
    items: [
      { label: 'Home', icon: 'i-lucide-house', to: '/', onSelect: close },
      { label: 'Glossary', icon: 'i-lucide-book-open-text', to: '/glossary', onSelect: close },
      ...Object.values(PROJECT_SECTIONS).map((section) => ({
        label: PROJECT_SECTION_LABELS[section],
        icon: PROJECT_SECTION_ICONS[section],
        to: `/projects/${project.value?.id}/${section}`,
        onSelect: close,
      })),
      ...Object.values(SETTINGS_LINKS).map((link) => ({ ...link, onSelect: close })),
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    items: Object.values(APPEARANCES).map((appearance) => ({
      label: APPEARANCE_LABELS[appearance],
      icon: APPEARANCE_ICONS[appearance],
      active: colorMode.preference === appearance,
      onSelect: () => {
        colorMode.preference = appearance
        close()
      },
    })),
  },
])
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      content:
        'top-[13vh] max-w-[660px] translate-y-0 overflow-hidden rounded-[22px] sm:top-[13vh] dark:bg-[#18181a]',
    }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="term"
        :groups="groups"
        :loading="texts.isFetching.value"
        placeholder="Search texts in any language, or jump to…"
        class="h-[min(560px,70vh)]"
        @update:open="open = $event"
      >
        <template #footer>
          <div class="flex items-center gap-4 text-xs text-ink-3">
            <span class="flex items-center gap-1.5"><UKbd value="↑" /><UKbd value="↓" />move</span>
            <span class="flex items-center gap-1.5"><UKbd value="enter" />open</span>
            <span class="ml-auto flex items-center gap-1.5"><UKbd value="esc" />close</span>
          </div>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
