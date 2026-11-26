<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { TextState } from '@glot/database/types/texts'
import GlotStateLegend from '@glot/ui/components/GlotStateLegend.vue'
import { TEXT_STATE_LABELS } from '@glot/ui/constants'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'

const { $api } = useNuxtApp()
const route = useRoute()
const { project } = useCurrentProject()
const words = ref<string>('')
const query = refDebounced(words, 200)
const state = ref<TextState | undefined>(undefined)
const search = useTemplateRef('search')
const wide = useMediaQuery('(min-width: 1024px)')

const filters = [
  { label: 'All', value: undefined },
  ...[TEXT_STATES.NEEDS_FIX, TEXT_STATES.TO_CHECK, TEXT_STATES.MISSING].map((value) => ({
    label: TEXT_STATE_LABELS[value],
    value,
  })),
]

const texts = useInfiniteQuery(() => ({
  ...$api.texts.search.infiniteOptions({
    input: (cursor: string | undefined) => ({
      projectId: project.value?.id ?? '',
      q: query.value || undefined,
      state: state.value,
      cursor,
    }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  }),
  enabled: Boolean(project.value),
  placeholderData: keepPreviousData,
}))

const items = computed(() => texts.data.value?.pages.flatMap((page) => page.items) ?? [])
const total = computed(() => texts.data.value?.pages[0]?.total ?? 0)

const selectedId = computed(() =>
  typeof route.query.text === 'string' ? route.query.text : undefined,
)

const selected = computed(() => items.value.find(({ id }) => id === selectedId.value))

const panelOpen = computed({
  get: () => Boolean(selected.value) && !wide.value,
  set: (open: boolean) => {
    if (!open) {
      select(undefined)
    }
  },
})

function select(textId: string | undefined) {
  return navigateTo({ query: { ...route.query, text: textId } }, { replace: true })
}

function more() {
  if (!texts.isFetchingNextPage.value) {
    return texts.fetchNextPage()
  }
}

defineShortcuts({ '/': () => search.value?.inputRef?.focus() })
</script>

<template>
  <AppPage id="texts" title="Texts">
    <template #actions>
      <UInput
        ref="search"
        v-model="words"
        icon="i-lucide-search"
        placeholder="Search any language"
        class="w-36 sm:w-72"
      >
        <template #trailing>
          <UKbd value="/" class="hidden sm:inline-flex" />
        </template>
      </UInput>
    </template>
    <template #toolbar>
      <div class="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6">
        <UButton
          v-for="filter in filters"
          :key="filter.label"
          :label="filter.label"
          size="sm"
          :color="state === filter.value ? 'primary' : 'neutral'"
          :variant="state === filter.value ? 'soft' : 'ghost'"
          class="shrink-0 rounded-full"
          @click="state = filter.value"
        />
        <span class="flex-1" />
        <GlotStateLegend class="hidden xl:flex" />
      </div>
    </template>
    <TextList
      v-if="project"
      class="-mx-4 -my-4 sm:-mx-6 sm:-my-6"
      :items="items"
      :source-language="project.sourceLanguage"
      :languages="project.languages.filter((language) => language !== project?.sourceLanguage)"
      :selected-id="selectedId"
      :has-more="texts.hasNextPage.value"
      @select="select"
      @more="more"
    />
  </AppPage>
  <UDashboardPanel v-if="selected && wide" id="text" :default-size="440" class="max-w-[480px]">
    <TextPanel :key="selected.id" :text="selected" @close="select(undefined)" />
  </UDashboardPanel>
  <USlideover v-model:open="panelOpen" side="right" :ui="{ content: 'max-w-full' }">
    <template #content>
      <TextPanel v-if="selected" :key="selected.id" :text="selected" @close="select(undefined)" />
    </template>
  </USlideover>
</template>
