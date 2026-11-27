<script setup lang="ts">
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '@glot/ui/constants'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { formatTimeAgo } from '@vueuse/core'
import { NEEDS_FILTER_LABELS, NEEDS_FILTERS } from '../constants/home.constants.ts'
import { REVIEW_SECONDS_PER_TEXT } from '../constants/review.constants.ts'

const { $api, $auth, $queryClient } = useNuxtApp()
const toast = useToast()
const { workspace } = useCurrentWorkspace()
const session = $auth.useSession()
const { project, projects } = useCurrentProject()
const { approve } = useRights()
const counts = useTextStateCounts()

const firstName = computed(() => session.value.data?.user.name.split(' ')[0] ?? '')

const greeting = computed(() => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening'
})

const today = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const overview = useQuery(() => ({
  ...$api.home.overview.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
  enabled: Boolean(workspace.value),
}))

const next = useQuery(() => ({
  ...$api.releases.next.queryOptions({ input: { projectId: project.value?.id ?? '' } }),
  enabled: Boolean(project.value),
}))

const filter = ref<string>(NEEDS_FILTERS.ALL)
const needsYou = computed(() => overview.data.value?.needsYou)

const fixRows = computed(() =>
  (needsYou.value?.fixes.items ?? []).map((item) => ({
    id: `fix-${item.projectId}-${item.textId}-${item.language}`,
    filter: NEEDS_FILTERS.FIXES,
    tone: 'fix',
    icon: 'i-lucide-triangle-alert',
    title: ` in ${languageName(item.language)}`,
    value: item.value ?? item.source.value,
    sub: item.reason.message,
    key: item.key,
    meta: `${item.shownIn.length} ${item.shownIn.length === 1 ? 'app' : 'apps'}`,
    action: 'Fix',
    primary: true,
    to: `/projects/${item.projectId}/texts?text=${item.textId}`,
  })),
)

const reviewRows = computed(() =>
  (needsYou.value?.reviews ?? [])
    .filter(({ total }) => total > 0)
    .map((item) => ({
      id: `review-${item.projectId}-${item.language}`,
      filter: NEEDS_FILTERS.REVIEWS,
      tone: 'check',
      icon: 'i-lucide-list-checks',
      title: `${item.total.toLocaleString('en-US')} ${languageName(item.language)} texts to check`,
      sub:
        item.sentForReview > 0
          ? `${item.sentForReview} sent for review · ${item.projectName}`
          : `You review ${languageName(item.language)} · ${item.projectName}`,
      key: undefined,
      value: undefined,
      meta: `~${Math.max(1, Math.round((item.total * REVIEW_SECONDS_PER_TEXT) / 60))} min`,
      action: 'Review',
      primary: false,
      to: `/projects/${item.projectId}/review/${item.language}`,
    })),
)

const conflictRows = computed(() =>
  (needsYou.value?.conflicts ?? [])
    .filter(({ total }) => total > 0)
    .map((item) => ({
      id: `conflict-${item.projectId}`,
      filter: NEEDS_FILTERS.REVIEWS,
      tone: 'warn',
      icon: 'i-lucide-git-compare-arrows',
      title: `${item.total} approved ${item.total === 1 ? 'change' : 'changes'} held back`,
      sub: `The French or the text changed after approval · ${item.projectName}`,
      key: undefined,
      value: undefined,
      meta: 'Releases',
      action: 'Resolve',
      primary: false,
      to: `/projects/${item.projectId}/releases`,
    })),
)

const drafts = computed(() => needsYou.value?.drafts.latest ?? [])

const filters = computed(() =>
  Object.values(NEEDS_FILTERS).map((value) => ({
    value,
    label: NEEDS_FILTER_LABELS[value],
    count: {
      [NEEDS_FILTERS.ALL]:
        fixRows.value.length +
        reviewRows.value.length +
        conflictRows.value.length +
        drafts.value.length,
      [NEEDS_FILTERS.FIXES]: fixRows.value.length,
      [NEEDS_FILTERS.REVIEWS]: reviewRows.value.length + conflictRows.value.length,
      [NEEDS_FILTERS.DRAFTS]: drafts.value.length,
    }[value],
  })),
)

const needs = computed(() =>
  [...fixRows.value, ...reviewRows.value, ...conflictRows.value].filter(
    (row) => filter.value === NEEDS_FILTERS.ALL || row.filter === filter.value,
  ),
)

const showDrafts = computed(
  () =>
    drafts.value.length > 0 &&
    (filter.value === NEEDS_FILTERS.ALL || filter.value === NEEDS_FILTERS.DRAFTS),
)

const send = useMutation(
  $api.drafts.send.mutationOptions({
    onSuccess: async () => {
      toast.add({ title: 'Sent for review', icon: 'i-lucide-circle-check', color: 'success' })
      await $queryClient.invalidateQueries({ queryKey: $api.home.key() })
    },
    onError: (error) =>
      toast.add({ title: error.message, icon: 'i-lucide-circle-alert', color: 'error' }),
  }),
)

const pending = computed(() => [TEXT_STATES.TO_CHECK, TEXT_STATES.NEEDS_FIX, TEXT_STATES.MISSING])

const waffle = computed(() => {
  const totals = Object.values(TEXT_STATES).map((state) => ({
    state,
    value: counts.value.byLanguage.reduce((sum, row) => sum + row.counts[state], 0),
  }))

  const all = totals.reduce((sum, { value }) => sum + value, 0)

  const cells = totals.flatMap(({ state, value }) =>
    Array.from({ length: all ? Math.round((value / all) * 200) : 0 }, () => state),
  )

  return { totals, all, cells: cells.slice(0, 200) }
})

const reviewedShare = computed(() => {
  const reviewed =
    waffle.value.totals.find(({ state }) => state === TEXT_STATES.REVIEWED)?.value ?? 0

  return waffle.value.all ? `${Math.round((reviewed / waffle.value.all) * 1000) / 10}%` : '—'
})
</script>

<template>
  <AppPage :title="`${greeting}, ${firstName}`" context="Home" scroll>
    <template #pill>
      <span v-if="filters[0]?.count" class="pill check pill-lg"
        ><UIcon name="i-lucide-bell" />{{ filters[0].count }} need you</span
      >
    </template>
    <template #meta>
      <span><UIcon name="i-lucide-calendar" />{{ today }}</span>
      <span v-if="approve.length > 0"
        ><UIcon name="i-lucide-languages" />You review
        {{ approve.map((code) => languageName(code)).join(', ') }}</span
      >
      <span v-if="next.data.value"
        ><UIcon name="i-lucide-rocket" />Next release at
        {{ clock.format(next.data.value.nextRunAt) }}</span
      >
    </template>
    <template #actions>
      <NuxtLink
        v-if="approve.length > 0"
        :to="`/projects/${project?.id}/review`"
        class="btn btn-outline"
        ><UIcon name="i-lucide-list-checks" />Start reviewing</NuxtLink
      >
    </template>

    <div class="stats week">
      <div class="stat">
        <div class="l">Texts</div>
        <div class="v">{{ counts.total.toLocaleString('en-US') }}</div>
      </div>
      <div v-for="state in pending" :key="state" class="stat">
        <div class="l">{{ TEXT_STATE_LABELS[state] }}</div>
        <div class="v">{{ counts.states[state].toLocaleString('en-US') }}</div>
      </div>
      <div class="stat">
        <div class="l">Reviewed</div>
        <div class="v">{{ reviewedShare }}</div>
      </div>
    </div>

    <div class="home">
      <div class="home-col">
        <section class="panel">
          <div class="panel-h">
            <h3>Needs you</h3>
            <AppSegmented
              v-if="filters[0]?.count"
              v-model="filter"
              :items="filters"
              small
              class="needs-filter"
            />
          </div>
          <div v-if="overview.isPending.value" class="rows" style="padding: 8px 24px 12px">
            <div v-for="line in 4" :key="line" class="r">
              <span class="sk" style="width: 34px; height: 34px; border-radius: 10px" />
              <div class="g-grow">
                <div class="sk" style="height: 12px; width: 60%" />
                <div class="sk" style="height: 10px; width: 40%; margin-top: 8px" />
              </div>
            </div>
          </div>
          <div v-else-if="overview.isError.value" class="empty" style="padding: 36px 24px">
            <span class="ico-tile fix"><UIcon name="i-lucide-circle-alert" /></span>
            <div class="h3">Could not load what needs you</div>
            <div class="row-flex">
              <button type="button" class="btn btn-outline btn-sm" @click="overview.refetch()">
                <UIcon name="i-lucide-rotate-cw" />Try again
              </button>
            </div>
          </div>
          <div v-else-if="needs.length > 0" class="rows hoverable" style="padding: 8px 24px 12px">
            <div v-for="row in needs" :key="row.id" class="r">
              <span :class="row.tone" class="ico-tile"><UIcon :name="row.icon" /></span>
              <div class="g-grow" style="min-width: 0">
                <div class="r-title">
                  <template v-if="row.value !== undefined"
                    >“<GlotTextValue :value="row.value" />”</template
                  >{{ row.title }}
                </div>
                <div class="r-sub r-line">
                  <AppTextKey
                    v-if="row.key"
                    :source="row.key.source"
                    :path="row.key.path.join('.')"
                  /><span v-if="row.key" class="faint">·</span
                  ><span class="r-rest">{{ row.sub }}</span>
                </div>
              </div>
              <div class="acts">
                <span class="meta">{{ row.meta }}</span>
                <NuxtLink
                  :to="row.to"
                  :class="row.primary ? 'btn-primary' : 'btn-outline'"
                  class="btn btn-sm"
                  >{{ row.action }}</NuxtLink
                >
              </div>
            </div>
          </div>
          <div v-if="showDrafts" class="drafts-block">
            <div class="drafts-h">
              <UIcon name="i-lucide-pencil-line" class="ic-14" />Your drafts · only you see them in
              the apps
            </div>
            <div class="rows" style="padding: 0 24px 12px">
              <div v-for="draft in drafts" :key="draft.draftId" class="r">
                <span class="lc plain">{{ draft.language }}</span>
                <div class="g-grow" style="min-width: 0">
                  <div class="r-title">
                    <AppTextKey :source="draft.key.source" :path="draft.key.path.join('.')" />
                  </div>
                  <div class="r-sub">
                    {{ draft.status === DRAFT_STATUSES.DRAFT ? 'Saved' : 'Sent' }}
                    {{ formatTimeAgo(new Date(draft.updatedAt)) }} · {{ draft.projectName }}
                  </div>
                </div>
                <button
                  v-if="draft.status === DRAFT_STATUSES.DRAFT"
                  type="button"
                  class="btn btn-ghost btn-sm"
                  :class="{
                    'is-loading':
                      send.isPending.value && send.variables.value?.draftId === draft.draftId,
                  }"
                  @click="send.mutate({ projectId: draft.projectId, draftId: draft.draftId })"
                >
                  Send for review<UIcon name="i-lucide-arrow-right" />
                </button>
                <span v-else class="meta">Waiting for a reviewer</span>
              </div>
            </div>
          </div>
          <div
            v-if="
              !overview.isPending.value &&
              !overview.isError.value &&
              needs.length === 0 &&
              !showDrafts
            "
            style="
              padding: 40px 24px 44px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 10px;
            "
          >
            <span class="ico-tile ok" style="width: 44px; height: 44px; border-radius: 14px"
              ><UIcon name="i-lucide-check" class="ic-18"
            /></span>
            <div class="h3" style="margin-top: 6px">Nothing needs you</div>
            <div class="muted" style="max-width: 40ch">
              New texts land here when developers add French.
            </div>
            <NuxtLink
              :to="`/projects/${project?.id}/texts`"
              class="btn btn-outline btn-sm"
              style="margin-top: 6px"
              ><UIcon name="i-lucide-text" />Browse texts</NuxtLink
            >
          </div>
        </section>
      </div>
      <div class="home-col">
        <section class="panel">
          <div class="proj-card">
            <div class="top">
              <span class="ptile check"><UIcon name="i-lucide-layers" /></span
              ><span class="h3">{{ project?.name }}</span
              ><span class="pct">{{ reviewedShare }}</span>
            </div>
            <div class="waffle" style="--cols: 20">
              <i
                v-for="(state, index) in waffle.cells"
                :key="index"
                :class="`bg-${TEXT_STATE_CLASSES[state]}`"
              />
            </div>
            <div class="legend">
              <span v-for="row in waffle.totals" :key="row.state"
                ><span
                  ><i :class="`bg-${TEXT_STATE_CLASSES[row.state]}`" class="swatch" />{{
                    TEXT_STATE_LABELS[row.state]
                  }}</span
                ><b>{{ row.value.toLocaleString('en-US') }}</b></span
              >
            </div>
            <div class="foot">
              <UIcon name="i-lucide-languages" class="ic-14" /><span
                >Every target language, every text</span
              >
            </div>
          </div>
          <NuxtLink
            v-for="other in projects.filter((item) => item.id !== project?.id)"
            :key="other.id"
            :to="`/projects/${other.id}/texts`"
            class="proj-mini"
          >
            <div class="top">
              <span class="ptile plain"><UIcon name="i-lucide-layers" /></span>{{ other.name }}
            </div>
          </NuxtLink>
        </section>
        <section class="panel">
          <div class="panel-h">
            <h3>Recently</h3>
            <NuxtLink class="meta" :to="`/projects/${project?.id}/releases`">All releases</NuxtLink>
          </div>
          <div class="act rows">
            <div v-for="release in overview.data.value?.shipped ?? []" :key="release.id" class="r">
              <span class="ico-tile ok" style="width: 24px; height: 24px; border-radius: 7px"
                ><UIcon name="i-lucide-rocket" class="ic-13"
              /></span>
              <div class="g-grow">
                <b>{{ release.startedByName ?? 'The clock' }}</b> released {{ release.changes }}
                {{ release.projectName }} texts
              </div>
              <span class="meta">{{ formatTimeAgo(new Date(release.createdAt)) }}</span>
            </div>
            <div v-if="(overview.data.value?.shipped.length ?? 0) === 0" class="r">
              <div class="g-grow muted">No release yet.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AppPage>
</template>
