<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '@glot/ui/constants'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { formatTimeAgo } from '@vueuse/core'
import { REVIEW_SECONDS_PER_TEXT } from '../constants/review.constants.ts'

const { $api, $auth } = useNuxtApp()
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

const queues = useQueries({
  queries: computed(() =>
    approve.value.map((language) => ({
      ...$api.reviews.queue.queryOptions({
        input: { projectId: project.value?.id ?? '', language, limit: 1 },
      }),
      enabled: Boolean(project.value),
    })),
  ),
  combine: (results) =>
    results.map((result, index) => ({
      language: approve.value[index] ?? '',
      total: result.data?.total ?? 0,
    })),
})

const next = useQuery(() => ({
  ...$api.releases.next.queryOptions({ input: { projectId: project.value?.id ?? '' } }),
  enabled: Boolean(project.value),
}))

const history = useQuery(() => ({
  ...$api.releases.history.queryOptions({
    input: { projectId: project.value?.id ?? '', limit: 5 },
  }),
  enabled: Boolean(project.value),
}))

const needs = computed(() => [
  ...(counts.value.states[TEXT_STATES.NEEDS_FIX] > 0
    ? [
        {
          tone: 'fix',
          icon: 'i-lucide-triangle-alert',
          title: `${counts.value.states[TEXT_STATES.NEEDS_FIX]} texts fail a check`,
          sub: 'Readers may see them wrong. Each one says what to fix.',
          meta: project.value?.name ?? '',
          action: 'Fix',
          primary: true,
          to: `/projects/${project.value?.id}/texts`,
        },
      ]
    : []),
  ...queues.value
    .filter(({ total }) => total > 0)
    .map(({ language, total }) => ({
      tone: 'check',
      icon: 'i-lucide-list-checks',
      title: `${total.toLocaleString('en-US')} ${languageName(language)} texts to check`,
      sub: `You review ${languageName(language)}.`,
      meta: `~${Math.max(1, Math.round((total * REVIEW_SECONDS_PER_TEXT) / 60))} min`,
      action: 'Review',
      primary: false,
      to: `/projects/${project.value?.id}/review/${language}`,
    })),
  ...((next.data.value?.conflicts ?? 0) > 0
    ? [
        {
          tone: 'warn',
          icon: 'i-lucide-git-compare-arrows',
          title: `${next.data.value?.conflicts} approved changes held back`,
          sub: 'The French or the text changed after they were approved.',
          meta: 'Releases',
          action: 'Resolve',
          primary: false,
          to: `/projects/${project.value?.id}/releases`,
        },
      ]
    : []),
])

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
      <span v-if="needs.length > 0" class="pill check pill-lg"
        ><UIcon name="i-lucide-bell" />{{ needs.length }} need you</span
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
          <div class="panel-h"><h3>Needs you</h3></div>
          <div v-if="needs.length > 0" class="rows hoverable" style="padding: 8px 24px 12px">
            <div v-for="row in needs" :key="row.title" class="r">
              <span :class="row.tone" class="ico-tile"><UIcon :name="row.icon" /></span>
              <div class="g-grow">
                <div class="r-title">{{ row.title }}</div>
                <div class="r-sub">{{ row.sub }}</div>
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
          <div
            v-else
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
            <div v-for="release in history.data.value?.items ?? []" :key="release.id" class="r">
              <span class="ico-tile ok" style="width: 24px; height: 24px; border-radius: 7px"
                ><UIcon name="i-lucide-rocket" class="ic-13"
              /></span>
              <div class="g-grow">
                <b>{{ release.startedByName ?? 'The clock' }}</b> released
                {{ release.changes }} texts
              </div>
              <span class="meta">{{ formatTimeAgo(new Date(release.createdAt)) }}</span>
            </div>
            <div v-if="(history.data.value?.items.length ?? 0) === 0" class="r">
              <div class="g-grow muted">No release yet.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AppPage>
</template>
