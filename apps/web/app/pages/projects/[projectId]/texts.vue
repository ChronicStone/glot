<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { TextState } from '@glot/database/types/texts'
import GlotChip from '@glot/ui/components/GlotChip.vue'
import GlotSearchField from '@glot/ui/components/GlotSearchField.vue'
import GlotStateLegend from '@glot/ui/components/GlotStateLegend.vue'
import { TEXT_STATE_LABELS } from '@glot/ui/constants'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'

const { $api } = useNuxtApp()
const route = useRoute()
const { project } = useCurrentProject()
const words = ref<string>('')
const state = ref<TextState | undefined>(undefined)
const search = ref<InstanceType<typeof GlotSearchField> | null>(null)

const filters = [
  { label: 'All', value: undefined },
  ...[TEXT_STATES.NEEDS_FIX, TEXT_STATES.TO_CHECK, TEXT_STATES.MISSING].map((value) => ({
    label: TEXT_STATE_LABELS[value],
    value,
  })),
]

const texts = useInfiniteQuery(
  computed(() => ({
    ...$api.texts.search.infiniteOptions({
      input: (cursor: string | undefined) => ({
        projectId: project.value?.id ?? '',
        q: words.value || undefined,
        state: state.value,
        cursor,
      }),
      initialPageParam: undefined,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
    enabled: Boolean(project.value),
    placeholderData: keepPreviousData,
  })),
)

const items = computed(() => texts.data.value?.pages.flatMap((page) => page.items) ?? [])
const total = computed(() => texts.data.value?.pages[0]?.total ?? 0)

const selectedId = computed(() =>
  typeof route.query.text === 'string' ? route.query.text : undefined,
)

const selected = computed(() => items.value.find(({ id }) => id === selectedId.value))

function select(textId: string | undefined) {
  return navigateTo({ query: { ...route.query, text: textId } }, { replace: true })
}

function more() {
  if (!texts.isFetchingNextPage.value) {
    return texts.fetchNextPage()
  }
}

function focusSearch(event: KeyboardEvent) {
  const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea')

  if (event.key === '/' && !typing) {
    event.preventDefault()
    search.value?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', focusSearch))

onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))
</script>

<template>
  <div class="grid min-h-0 flex-1 md:grid-cols-[1fr_auto]">
    <div class="flex min-h-0 flex-col" :class="selected ? 'max-md:hidden' : ''">
      <AppPageHeader title="Texts" :detail="project ? `${total} in ${project.name}` : undefined">
        <GlotSearchField
          ref="search"
          v-model="words"
          placeholder="Search any language"
          shortcut="/"
          class="w-full md:w-[280px]"
        />
      </AppPageHeader>
      <nav aria-label="Filters" class="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 md:px-6">
        <GlotChip
          v-for="filter in filters"
          :key="filter.label"
          :active="state === filter.value"
          @click="state = filter.value"
        >
          {{ filter.label }}
        </GlotChip>
        <span class="flex-1" />
        <GlotStateLegend class="hidden lg:flex" />
      </nav>
      <TextList
        v-if="project"
        :items="items"
        :source-language="project.sourceLanguage"
        :languages="project.languages.filter((language) => language !== project?.sourceLanguage)"
        :selected-id="selectedId"
        :has-more="texts.hasNextPage.value"
        @select="select"
        @more="more"
      />
    </div>
    <TextPanel
      v-if="selected"
      :key="selected.id"
      :text="selected"
      class="min-h-0 md:w-[400px] md:border-l md:border-line xl:w-[460px]"
      @close="select(undefined)"
    />
  </div>
</template>
