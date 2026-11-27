<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import type { TextState } from '@glot/database/types/texts'
import GlotStateLegend from '@glot/ui/components/GlotStateLegend.vue'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '@glot/ui/constants'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/vue-query'
import { TEXT_LIST } from '../../../constants/texts.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useCurrentProject()
const reviewTotal = useReviewTotal()
const counts = useTextStateCounts()
const { write } = useRights()
const words = ref<string>('')
const query = refDebounced(words, 200)
const state = ref<TextState | undefined>()
const language = ref<string | undefined>()
const search = useTemplateRef<HTMLInputElement>('search')
const list = useTemplateRef('list')
const wide = useMediaQuery('(min-width: 761px)')

const languages = computed(
  () => project.value?.languages.filter((code) => code !== project.value?.sourceLanguage) ?? [],
)

const ALL_LANGUAGES = 'all'

const languageGroups = computed(() => [
  {
    options: [
      {
        value: ALL_LANGUAGES,
        label: 'All languages',
        icon: 'i-lucide-languages',
        description: 'Counts every language',
        context: counts.value.total.toLocaleString('en-US'),
        contextLabel: 'texts',
      },
    ],
  },
  {
    label: 'Target languages',
    options: counts.value.byLanguage.map((row) => ({
      value: row.language,
      code: row.language,
      label: languageName(row.language),
      native: nativeLanguageName(row.language),
      description: `${row.counts[TEXT_STATES.TO_CHECK].toLocaleString('en-US')} to check · ${row.counts[TEXT_STATES.NEEDS_FIX]} ${row.counts[TEXT_STATES.NEEDS_FIX] === 1 ? 'fix' : 'fixes'}`,
      context: reviewedShare(row),
      contextLabel: 'reviewed',
      bars: Object.fromEntries(
        [
          TEXT_STATES.REVIEWED,
          TEXT_STATES.TO_CHECK,
          TEXT_STATES.NEEDS_FIX,
          TEXT_STATES.MISSING,
        ].map((state) => [TEXT_STATE_CLASSES[state], row.counts[state]]),
      ),
    })),
  },
])

const filters = computed(() => [
  { label: 'All', value: undefined, count: counts.value.total },
  ...[TEXT_STATES.NEEDS_FIX, TEXT_STATES.TO_CHECK, TEXT_STATES.MISSING].map((value) => ({
    label: TEXT_STATE_LABELS[value],
    value,
    count: counts.value.states[value],
  })),
])

const texts = useInfiniteQuery(() => ({
  ...$api.texts.search.infiniteOptions({
    input: (cursor: string | undefined) => ({
      projectId: project.value?.id ?? '',
      q: query.value || undefined,
      state: state.value,
      language: language.value,
      limit: TEXT_LIST.PAGE_SIZE,
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

const fetched = useQuery(() => ({
  ...$api.texts.get.queryOptions({
    input: { projectId: project.value?.id ?? '', textId: selectedId.value ?? '' },
  }),
  enabled: Boolean(
    project.value && selectedId.value && !items.value.some(({ id }) => id === selectedId.value),
  ),
}))

const selected = computed(
  () => items.value.find(({ id }) => id === selectedId.value) ?? fetched.data.value,
)

const sheetOpen = computed({
  get: () => Boolean(selected.value) && !wide.value,
  set: (open: boolean) => {
    if (!open) {
      select(undefined)
    }
  },
})

const sync = useMutation(
  $api.projects.sync.mutationOptions({
    onSuccess: async ({ texts: read }) => {
      toast.add({ title: `Read ${read.toLocaleString('en-US')} texts`, color: 'success' })

      await $queryClient.invalidateQueries({ queryKey: $api.texts.key() })
    },
    onError: (error) => toast.add({ title: error.message, color: 'error' }),
  }),
)

function select(textId: string | undefined) {
  return navigateTo({ query: { ...route.query, text: textId } }, { replace: true })
}

function step(offset: number) {
  const index = items.value.findIndex(({ id }) => id === selectedId.value) + offset
  const next = items.value[Math.max(0, Math.min(items.value.length - 1, index))]

  if (next) {
    list.value?.scrollTo(items.value.indexOf(next))

    return select(next.id)
  }
}

function clear() {
  words.value = ''
  state.value = undefined
  language.value = undefined
}

watch([wide, items], ([isWide, loaded]) => {
  const first = loaded[0]

  if (isWide && first && !selectedId.value) {
    select(first.id)
  }
})

function more() {
  if (!texts.isFetchingNextPage.value) {
    return texts.fetchNextPage()
  }
}

function reviewedShare(row: { counts: Record<TextState, number> }) {
  return counts.value.total
    ? `${Math.round((row.counts[TEXT_STATES.REVIEWED] / counts.value.total) * 1000) / 10}%`
    : '—'
}

defineShortcuts({
  '/': () => search.value?.focus(),
  arrowdown: () => step(1),
  arrowup: () => step(-1),
})
</script>

<template>
  <AppPage title="Texts" class="tx-head" :context="project?.name">
    <template #pill>
      <span v-if="texts.isError.value" class="pill warn pill-lg"
        ><UIcon name="i-lucide-cloud-off" />Repository unreachable</span
      >
      <span v-else class="pill ok pill-lg"><UIcon name="i-lucide-check" />Up to date</span>
    </template>
    <template #actions>
      <NuxtLink
        v-if="reviewTotal > 0"
        :to="`/projects/${project?.id}/review`"
        class="btn btn-outline"
        ><UIcon name="i-lucide-list-checks" />Review<span class="count">{{
          reviewTotal
        }}</span></NuxtLink
      >
      <button
        type="button"
        class="btn btn-outline btn-icon"
        :class="{ 'is-loading': sync.isPending.value }"
        title="Read the latest commit"
        @click="sync.mutate({ projectId: project?.id ?? '' })"
      >
        <UIcon name="i-lucide-refresh-cw" />
      </button>
    </template>
    <template #meta>
      <span><UIcon name="i-lucide-layers" />{{ project?.name }}</span>
      <span><UIcon name="i-lucide-languages" />{{ languages.length + 1 }} languages</span>
      <span><UIcon name="i-lucide-app-window" />{{ project?.apps.length }} apps</span>
    </template>

    <div class="stats lang-band">
      <div class="stat">
        <div class="l"><UIcon name="i-lucide-eye" class="ic-14" />Waiting for a reviewer</div>
        <div class="v num">
          {{ counts.states[TEXT_STATES.TO_CHECK].toLocaleString('en-US')
          }}<small>· {{ counts.states[TEXT_STATES.NEEDS_FIX] }} need a fix</small>
        </div>
      </div>
      <div v-for="row in counts.byLanguage.slice(0, 4)" :key="row.language" class="stat">
        <div class="l">
          <span class="lc plain">{{ row.language }}</span>{{ languageName(row.language) }}
        </div>
        <div class="v num">{{ reviewedShare(row) }}<small>reviewed</small></div>
        <div class="sbar sbar-thin">
          <i
            v-for="key in [
              TEXT_STATES.REVIEWED,
              TEXT_STATES.TO_CHECK,
              TEXT_STATES.NEEDS_FIX,
              TEXT_STATES.MISSING,
            ].filter((value) => row.counts[value] > 0)"
            :key="key"
            :class="`bg-${TEXT_STATE_CLASSES[key]}`"
            :style="{ flex: row.counts[key] }"
          />
        </div>
      </div>
    </div>

    <div class="tx" style="position: relative">
      <section class="panel tx-list">
        <div v-if="texts.isError.value" class="banner warn" style="margin: 12px 14px 0">
          <UIcon name="i-lucide-cloud-off" /><span
            ><b>The repository cannot be read right now.</b> Editing and reviews resume as soon as
            it answers.</span
          ><button type="button" class="btn btn-ghost btn-xs" @click="texts.refetch()">
            <UIcon name="i-lucide-rotate-cw" />Retry
          </button>
        </div>
        <div class="tx-tools">
          <label class="input input-soft"
            ><UIcon name="i-lucide-search" /><input
              ref="search"
              v-model="words"
              placeholder="Search any language or key"
              aria-label="Search"
            /><span class="kbd">/</span></label
          >
          <AppSelect
            :model-value="language ?? ALL_LANGUAGES"
            :groups="languageGroups"
            button
            wide
            footer
            icon="i-lucide-languages"
            placeholder="All languages"
            search="Filter languages"
            @update:model-value="language = $event === ALL_LANGUAGES ? undefined : $event"
          />
          <AiFillMissing
            v-if="project && language && write.includes(language)"
            :project-id="project.id"
            :language="language"
          />
        </div>
        <div class="tx-chips">
          <button
            v-for="filter in filters"
            :key="filter.label"
            type="button"
            :class="{ on: state === filter.value }"
            class="chip"
            @click="state = filter.value"
          >
            <i
              v-if="filter.value"
              :class="`bg-${TEXT_STATE_CLASSES[filter.value]}`"
              class="swatch"
            />{{ filter.label
            }}<span class="count">{{ filter.count.toLocaleString('en-US') }}</span>
          </button>
        </div>
        <div class="tx-cols">
          <span class="sortable">{{ languageName(project?.sourceLanguage ?? 'fr') }}</span
          ><span class="lcodes"><span v-for="code in languages" :key="code">{{ code }}</span></span>
        </div>
        <TextList
          ref="list"
          :items="items"
          :selected-id="selectedId"
          :has-more="texts.hasNextPage.value"
          :loading="texts.isPending.value"
          @select="select"
          @more="more"
        >
          <template #empty>
            <div class="empty">
              <span class="ico-tile"><UIcon name="i-lucide-search-x" /></span>
              <div class="h3">{{ query ? `No text says “${query}”` : 'No text here' }}</div>
              <p>
                {{
                  query
                    ? 'Glot searched every language and key of this project.'
                    : 'Nothing matches these filters.'
                }}
              </p>
              <div class="row-flex">
                <button type="button" class="btn btn-outline btn-sm" @click="clear">
                  Clear the filters
                </button>
              </div>
            </div>
          </template>
        </TextList>
        <div class="tx-foot">
          <span class="num"
            >{{ items.length.toLocaleString('en-US') }} of {{ total.toLocaleString('en-US') }}</span
          >
          <GlotStateLegend :language="languages[0] ?? 'en'" />
          <div class="right">
            <span><span class="kbd">↑</span><span class="kbd">↓</span>move</span>
            <span><span class="kbd">/</span>search</span>
          </div>
        </div>
      </section>
      <aside v-if="wide" class="panel insp">
        <TextPanel v-if="selected" :key="selected.id" :text="selected" />
        <div v-else class="empty" style="margin: auto">
          <span class="ico-tile"><UIcon name="i-lucide-mouse-pointer-click" /></span>
          <p>Pick a text to see every language.</p>
        </div>
      </aside>
    </div>

    <UDrawer v-model:open="sheetOpen" :ui="{ content: 'panel insp h-[88dvh]' }">
      <template #content>
        <TextPanel
          v-if="selected"
          :key="selected.id"
          :text="selected"
          closable
          @close="select(undefined)"
        />
      </template>
    </UDrawer>
  </AppPage>
</template>
