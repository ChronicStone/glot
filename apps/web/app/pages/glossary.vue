<script setup lang="ts">
import type { GlossaryTerm } from '@glot/contract'
import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { createAppColumnHelper, useAppTable } from '../config/table.config.ts'
import { GLOSSARY_FILTERS, GLOSSARY_STATUS_PILLS } from '../constants/glossary.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const { workspace } = useCurrentWorkspace()
const { suggests, languages: mine, decides } = useGlossaryRights()
const { projects } = useCurrentProject()
const search = ref<string>('')
const filter = ref<string>(GLOSSARY_FILTERS.ALL)
const selectedId = ref<string | undefined>()
const editing = ref<GlossaryTerm | undefined>()
const editorOpen = ref<boolean>(false)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')

const statuses = Object.values(GLOSSARY_TERM_STATUSES).toSorted(
  (first, second) => GLOSSARY_STATUS_PILLS[first].rank - GLOSSARY_STATUS_PILLS[second].rank,
)

const sources = computed(() => [
  ...new Set(projects.value.map(({ sourceLanguage }) => sourceLanguage)),
])

const languages = computed(() => [
  ...new Set(
    projects.value.flatMap(({ sourceLanguage, languages: codes }) => [sourceLanguage, ...codes]),
  ),
])

const concepts = useQuery(() => ({
  ...$api.glossary.listConcepts.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
  enabled: Boolean(workspace.value),
}))

const all = computed(() => concepts.data.value ?? [])

const shown = computed(() =>
  all.value
    .toSorted(
      (first, second) =>
        GLOSSARY_STATUS_PILLS[first.status].rank - GLOSSARY_STATUS_PILLS[second.status].rank,
    )
    .filter(
      (concept) =>
        (filter.value === GLOSSARY_FILTERS.ALL || concept.status === filter.value) &&
        [concept.name, ...Object.values(concept.terms).map(({ term }) => term)]
          .join(' ')
          .toLowerCase()
          .includes(search.value.trim().toLowerCase()),
    ),
)

const filters = computed(() => [
  { label: 'All', value: GLOSSARY_FILTERS.ALL, count: all.value.length },
  ...statuses.map((status) => ({
    label: GLOSSARY_STATUS_PILLS[status].label,
    value: status,
    count: all.value.filter((concept) => concept.status === status).length,
  })),
])

const targets = computed(() =>
  languages.value.filter((code) => !sources.value.includes(code)).slice(0, 4),
)

const wide = useMediaQuery('(min-width: 761px)')

const selected = computed(
  () =>
    shown.value.find(({ id }) => id === selectedId.value) ??
    (wide.value ? shown.value[0] : undefined),
)

const sheetOpen = computed({
  get: () => Boolean(selected.value) && !wide.value,
  set: (open: boolean) => {
    if (!open) {
      selectedId.value = undefined
    }
  },
})

const [DefineDetail, UseDetail] = createReusableTemplate()

const helper = createAppColumnHelper<GlossaryTerm>()

const columns = computed(() =>
  helper.columns([
    helper.accessor('name', { header: 'Concept' }),
    ...targets.value.map((language) =>
      helper.accessor((concept) => concept.terms[language]?.term ?? '', {
        id: language,
        header: language,
      }),
    ),
    helper.accessor('status', { header: 'Status' }),
  ]),
)

const table = useAppTable({ columns, data: shown, getRowId: (concept) => concept.id })

async function refresh(message: string) {
  toast.add({ title: message, color: 'success', icon: 'i-lucide-circle-check' })

  await $queryClient.invalidateQueries({ queryKey: $api.glossary.key() })
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

const setStatus = useMutation(
  $api.glossary.setConceptStatus.mutationOptions({
    onSuccess: () => refresh('Status changed'),
    onError: failed,
  }),
)

const remove = useMutation(
  $api.glossary.removeConcept.mutationOptions({
    onSuccess: () => refresh('Concept removed'),
    onError: failed,
  }),
)

defineShortcuts({ '/': () => searchInput.value?.focus() })

function edit(concept: GlossaryTerm | undefined) {
  editing.value = concept
  editorOpen.value = true
}
</script>

<template>
  <DefineDetail>
    <div v-if="selected" class="pane-scroll">
      <div class="gd">
        <div class="actions-row">
          <AppSegmented
            v-if="decides(selected)"
            :model-value="selected.status"
            :items="
              statuses.map((status) => ({
                label: GLOSSARY_STATUS_PILLS[status].label,
                value: status,
              }))
            "
            small
            @update:model-value="setStatus.mutate({ conceptId: selected.id, status: $event })"
          />
          <span class="g-grow" />
          <button
            v-if="suggests"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="edit(selected)"
          >
            <UIcon name="i-lucide-pencil" />Edit
          </button>
          <button
            v-if="decides(selected)"
            type="button"
            class="btn btn-ghost btn-sm btn-icon"
            aria-label="Remove the concept"
            @click="remove.mutate({ conceptId: selected.id })"
          >
            <UIcon name="i-lucide-trash-2" />
          </button>
        </div>
        <h2>
          {{ selected.name
          }}<span :class="GLOSSARY_STATUS_PILLS[selected.status].tone" class="pill"
            ><UIcon :name="GLOSSARY_STATUS_PILLS[selected.status].icon" />{{
              GLOSSARY_STATUS_PILLS[selected.status].label
            }}</span
          >
        </h2>
        <div class="def">{{ selected.definition }}</div>
        <div v-if="selected.neverTranslate" class="banner info">
          <UIcon name="i-lucide-lock" /><span
            >Never translated: it stays as written in every language.</span
          >
        </div>
        <div>
          <div class="sec-t">Terms<span class="meta">singular · plural · never use</span></div>
          <div class="tterms">
            <div v-for="(words, language) in selected.terms" :key="language" class="t">
              <span class="lc plain">{{ language }}</span
              ><span class="w"
                >{{ words.term }}<small v-if="words.plural">{{ words.plural }}</small></span
              ><span class="avoid"><s v-for="word in words.avoid" :key="word">{{ word }}</s></span>
            </div>
          </div>
        </div>
        <div v-if="selected.notes">
          <div class="sec-t">Notes</div>
          <div class="well" style="font-size: 13px">{{ selected.notes }}</div>
        </div>
      </div>
    </div>
  </DefineDetail>
  <AppPage title="Glossary">
    <template #pill>
      <span class="pill plain pill-lg"
        ><UIcon name="i-lucide-book-open-text" />{{
          counted({ count: all.length, one: 'concept', other: 'concepts' })
        }}</span
      >
    </template>
    <template #meta>
      <span><UIcon name="i-lucide-globe" />Whole workspace</span>
      <span><UIcon name="i-lucide-sparkle" />The AI uses validated terms only</span>
      <span><UIcon name="i-lucide-shield-check" />Checked before each release</span>
    </template>
    <template #actions>
      <button v-if="suggests" type="button" class="btn btn-primary" @click="edit(undefined)">
        <UIcon name="i-lucide-plus" />New concept
      </button>
    </template>

    <div
      :style="
        all.length === 0 && !concepts.isPending.value ? { gridTemplateColumns: '1fr' } : undefined
      "
      class="split"
    >
      <section class="panel">
        <div class="toolbar">
          <label class="input input-soft"
            ><UIcon name="i-lucide-search" /><input
              ref="searchInput"
              v-model="search"
              placeholder="Search a term in any language"
              aria-label="Search the glossary"
            /><span class="kbd">/</span></label
          >
          <AppSegmented v-model="filter" :items="filters" />
        </div>
        <div class="pane-scroll">
          <div v-if="all.length === 0 && !concepts.isPending.value" class="empty">
            <span class="ico-tile"><UIcon name="i-lucide-book-open-text" /></span>
            <div class="h3">No concepts yet</div>
            <p>A concept is a word your product must always translate the same way, like “lot”.</p>
            <div class="row-flex">
              <button
                v-if="suggests"
                type="button"
                class="btn btn-outline btn-sm"
                @click="edit(undefined)"
              >
                <UIcon name="i-lucide-plus" />New concept
              </button>
            </div>
          </div>
          <AppDataTable
            v-else
            :table="table"
            :loading="concepts.isPending.value"
            :selected-id="selected?.id"
            empty="No concept matches."
            class="gtbl"
            @select="selectedId = $event"
          >
            <template #cell-name="{ row }">
              <div class="cn">{{ row.name }}</div>
              <div class="cd">{{ row.definition }}</div>
            </template>
            <template v-for="language in targets" :key="language" #[`header-${language}`]>
              <span class="lc plain">{{ language }}</span>
            </template>
            <template v-for="language in targets" :key="language" #[`cell-${language}`]="{ row }">
              <span class="term">{{ row.terms[language]?.term ?? '—' }}</span>
            </template>
            <template #cell-status="{ row }">
              <span :class="GLOSSARY_STATUS_PILLS[row.status].tone" class="pill"
                ><UIcon :name="GLOSSARY_STATUS_PILLS[row.status].icon" />{{
                  GLOSSARY_STATUS_PILLS[row.status].label
                }}</span
              >
            </template>
          </AppDataTable>
        </div>
      </section>

      <aside v-if="selected && wide" class="panel"><UseDetail /></aside>
    </div>

    <GlossaryConceptEditor
      v-if="workspace"
      :key="editing?.id ?? 'new'"
      v-model:open="editorOpen"
      :concept="editing"
      :workspace-id="workspace.id"
      :languages="languages"
      :editable="mine"
      :details="!editing || decides(editing)"
      @saved="selectedId = $event"
    />
    <UDrawer v-model:open="sheetOpen" :ui="{ content: 'panel h-[88dvh]' }">
      <template #content><UseDetail /></template>
    </UDrawer>
  </AppPage>
</template>
