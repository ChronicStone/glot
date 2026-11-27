<script setup lang="ts">
import { CONFLICT_RESOLUTIONS } from '@glot/contract'
import { RELEASE_STATUSES } from '@glot/database/constants/releases'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { formatTimeAgo } from '@vueuse/core'
import { RELEASE_LANGUAGE_COLORS } from '../../../constants/releases.constants.ts'
import { CONFLICT_REASON_LABELS, TIMELINE_HOURS } from '../../../constants/review.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const { project } = useCurrentProject()
const projectId = computed(() => project.value?.id ?? '')
const opened = ref<string | undefined>()
const now = ref<number>(Date.now())
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

const next = useQuery(() => ({
  ...$api.releases.next.queryOptions({ input: { projectId: projectId.value } }),
  enabled: Boolean(project.value),
}))

const languageColors = Object.values(RELEASE_LANGUAGE_COLORS)

const ready = computed(() => {
  const found = next.data.value?.ready

  return {
    changes: found?.changes ?? 0,
    sources: found?.sources ?? [],
    items: found?.items ?? [],
    more: Math.max((found?.changes ?? 0) - (found?.items.length ?? 0), 0),
    languages: (found?.languages ?? []).map((entry, index) => ({
      ...entry,
      name: languageName(entry.language),
      color: languageColors[Math.min(index, languageColors.length - 1)],
    })),
  }
})

const history = useQuery(() => ({
  ...$api.releases.history.queryOptions({ input: { projectId: projectId.value, limit: 20 } }),
  enabled: Boolean(project.value),
}))

const conflicts = useQuery(() => ({
  ...$api.releases.conflicts.queryOptions({ input: { projectId: projectId.value, limit: 20 } }),
  enabled: Boolean(project.value),
}))

const changes = useQuery(() => ({
  ...$api.releases.changes.queryOptions({
    input: { projectId: projectId.value, releaseId: opened.value ?? '', limit: 100 },
  }),
  enabled: Boolean(project.value && opened.value),
}))

async function refresh(message: string) {
  toast.add({ title: message, color: 'success', icon: 'i-lucide-circle-check' })

  await Promise.all([
    $queryClient.invalidateQueries({ queryKey: $api.releases.key() }),
    $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
  ])
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

const run = useMutation(
  $api.releases.run.mutationOptions({
    onSuccess: (release) =>
      refresh(
        `Release opened with ${counted({ count: release.changes, one: 'text', other: 'texts' })}`,
      ),
    onError: failed,
  }),
)

const refused = ref<Record<string, string>>({})

const undo = useMutation(
  $api.releases.undo.mutationOptions({
    onSuccess: () => refresh('The old text comes back with the next release'),
    onError: (error, { changeId }) => {
      refused.value = { ...refused.value, [changeId]: error.message }
      failed(error)
    },
  }),
)

const heldBack = computed(
  () =>
    new Set(
      (conflicts.data.value?.items ?? []).map(({ draft }) => `${draft.textId}|${draft.language}`),
    ),
)

function undoBlocked(change: { id: string; textId: string; language: string; undone: boolean }) {
  if (change.undone) {
    return 'Already undone'
  }

  if (heldBack.value.has(`${change.textId}|${change.language}`)) {
    return 'A held-back change exists for this text. Resolve it first.'
  }

  return refused.value[change.id] ?? ''
}

const resolve = useMutation(
  $api.releases.resolveConflict.mutationOptions({
    onSuccess: () => refresh('Decision saved'),
    onError: failed,
  }),
)

const releases = computed(() => [
  ...(next.data.value?.open ? [next.data.value.open] : []),
  ...(history.data.value?.items ?? []).filter(
    (release) => release.id !== next.data.value?.open?.id,
  ),
])

const range = computed(() => {
  const hour = 3_600_000
  const from = Math.floor((now.value - TIMELINE_HOURS.BEFORE * hour) / hour) * hour

  return { from, to: from + (TIMELINE_HOURS.BEFORE + TIMELINE_HOURS.AFTER + 1) * hour }
})

function hourOf(date: Date) {
  return (date.getTime() - range.value.from) / 3_600_000
}

const span = computed(() => (range.value.to - range.value.from) / 3_600_000)

function position(hour: number) {
  return `${(Math.min(span.value, Math.max(0, hour)) / span.value) * 100}%`
}

function width(options: { from: number; to: number }) {
  const from = Math.max(0, options.from)
  const to = Math.min(span.value, options.to)

  return `${(Math.max(0, to - from) / span.value) * 100}%`
}

const lanes = computed(() =>
  releases.value
    .filter(
      (release) =>
        (release.mergedAt ? new Date(release.mergedAt).getTime() : now.value) >= range.value.from,
    )
    .map((release) => {
      const opened = hourOf(new Date(release.createdAt))
      const merged = release.mergedAt ? hourOf(new Date(release.mergedAt)) : undefined
      const current = hourOf(new Date(now.value))

      return {
        release,
        bars: [
          {
            kind: 'checks',
            label: release.pullRequestNumber ? `#${release.pullRequestNumber}` : 'Release branch',
            from: opened,
            to: merged ?? current,
          },
          ...(merged === undefined
            ? []
            : [{ kind: 'live', label: 'Merged', from: merged, to: current }]),
        ],
      }
    }),
)

const hours = computed(() =>
  Array.from({ length: Math.floor(span.value / 2) + 1 }, (_, index) => index * 2),
)

function hourLabel(hour: number) {
  return clock.format(new Date(range.value.from + hour * 3_600_000))
}

function startedBy(release: { startedByName: string | null }) {
  return release.startedByName ?? 'the clock'
}

useIntervalFn(() => {
  now.value = Date.now()
}, 60_000)
</script>

<template>
  <AppPage title="Releases" scroll>
    <template #pill>
      <span v-if="next.data.value?.open" class="pill check pill-lg"
        ><UIcon name="i-lucide-git-pull-request" />Waiting to merge</span
      >
      <span v-else-if="(next.data.value?.conflicts ?? 0) > 0" class="pill warn pill-lg"
        ><UIcon name="i-lucide-git-compare-arrows" />{{ next.data.value?.conflicts }} held
        back</span
      >
      <span v-else class="pill ok pill-lg"><UIcon name="i-lucide-check" />On track</span>
    </template>
    <template #meta>
      <span
        ><UIcon name="i-lucide-rocket" />{{
          counted({ count: history.data.value?.total ?? 0, one: 'release', other: 'releases' })
        }}</span
      >
      <span v-if="next.data.value"
        ><UIcon name="i-lucide-clock" />Next at {{ clock.format(next.data.value.nextRunAt) }}</span
      >
      <span
        ><UIcon name="i-lucide-app-window" />{{
          project?.apps.map(({ name }) => name).join(', ')
        }}</span
      >
    </template>

    <section class="panel tl">
      <div class="tl-top">
        <h3>Last 12 hours</h3>
        <div class="legend">
          <span><i class="swatch" style="background: var(--glot-d-blue)" />Pull request open</span>
          <span
            ><i
              class="swatch"
              style="
                background: color-mix(in oklab, var(--glot-d-green) 30%, var(--glot-panel));
                box-shadow: inset 0 0 0 1px var(--glot-d-green);
              "
            />Merged</span
          >
        </div>
      </div>
      <div class="tl-grid">
        <div class="tl-gridlines">
          <i v-for="hour in hours" :key="hour" :style="{ left: position(hour) }" />
          <span class="tl-now" :style="{ left: position(hourOf(new Date(now))) }"
            ><span class="tag">{{ clock.format(new Date(now)) }}</span></span
          >
        </div>
        <template v-for="lane in lanes" :key="lane.release.id">
          <div class="tl-lbl">
            <b>{{ clock.format(new Date(lane.release.createdAt)) }}</b
            ><span
              >{{ counted({ count: lane.release.changes, one: 'text', other: 'texts' }) }} ·
              {{ startedBy(lane.release) }}</span
            >
          </div>
          <div class="tl-lane">
            <span
              v-for="bar in lane.bars"
              :key="bar.kind"
              :class="bar.kind"
              class="tl-bar"
              :style="{ left: position(bar.from), width: width({ from: bar.from, to: bar.to }) }"
              :title="bar.label"
              ><UIcon v-if="bar.kind === 'live'" name="i-lucide-check" />{{ bar.label }}</span
            >
          </div>
        </template>
        <template v-if="next.data.value">
          <div class="tl-lbl">
            <b>{{ clock.format(next.data.value.nextRunAt) }} · next</b
            ><span
              >{{
                counted({ count: next.data.value.ready.changes, one: 'text', other: 'texts' })
              }}
              · Approved</span
            >
          </div>
          <div class="tl-lane">
            <span
              class="tl-bar collect"
              :style="{
                left: position(hourOf(new Date(now))),
                width: width({
                  from: hourOf(new Date(now)),
                  to: hourOf(next.data.value.nextRunAt),
                }),
              }"
              >Approvals</span
            >
          </div>
        </template>
        <div />
        <div class="tl-axis">
          <span v-for="hour in hours" :key="hour" :style="{ left: position(hour) }">{{
            hourLabel(hour)
          }}</span>
        </div>
      </div>
    </section>

    <div class="rel2">
      <div>
        <section class="panel">
          <div class="panel-h">
            <h3>Needs you</h3>
            <span class="meta">{{ conflicts.data.value?.total ?? 0 }}</span>
          </div>
          <div class="rows" style="padding: 8px 24px 16px">
            <div
              v-for="conflict in conflicts.data.value?.items ?? []"
              :key="conflict.draft.id"
              class="r"
              style="flex-direction: column; align-items: stretch; gap: 0"
            >
              <div class="row-flex" style="gap: 14px">
                <span class="ico-tile warn"><UIcon name="i-lucide-git-compare-arrows" /></span>
                <div class="g-grow">
                  <div class="r-title">{{ CONFLICT_REASON_LABELS[conflict.reason] }}</div>
                  <div class="r-sub">
                    <span class="key">{{ keyOfTextId(conflict.draft.textId).path }}</span> ·
                    {{ keyOfTextId(conflict.draft.textId).source }} ·
                    {{ languageName(conflict.draft.language) }}
                  </div>
                </div>
              </div>
              <div class="conf">
                <div class="well">
                  <div class="h"><UIcon name="i-lucide-file-text" class="ic-13" />French now</div>
                  <div class="t">
                    <GlotTextValue v-if="conflict.source" :value="conflict.source" /><span
                      v-else
                      class="muted"
                      >Gone</span
                    >
                  </div>
                </div>
                <div class="well">
                  <div class="h">
                    <AppAvatar :name="conflict.draft.authorName" size="sm" />{{
                      conflict.draft.authorName
                    }}’s approved change
                  </div>
                  <div class="t"><GlotTextValue :value="conflict.draft.value" /></div>
                </div>
              </div>
              <div class="conf-acts">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="!conflict.source"
                  @click="
                    resolve.mutate({
                      projectId,
                      draftId: conflict.draft.id,
                      resolution: CONFLICT_RESOLUTIONS.KEEP,
                    })
                  "
                >
                  Keep the update
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm"
                  @click="
                    resolve.mutate({
                      projectId,
                      draftId: conflict.draft.id,
                      resolution: CONFLICT_RESOLUTIONS.LEAVE_OUT,
                    })
                  "
                >
                  Leave it out of this release
                </button>
              </div>
            </div>
            <div v-if="(conflicts.data.value?.items.length ?? 0) === 0" class="r">
              <span class="ico-tile ok"><UIcon name="i-lucide-check" /></span>
              <div class="g-grow">
                <div class="r-title">Nothing is held back</div>
                <div class="r-sub">Approved changes go out with the next release.</div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel" style="margin-top: 12px">
          <div class="panel-h">
            <h3>Shipped</h3>
            <span class="meta">Undo puts the old text back with the next release</span>
          </div>
          <div class="rows hoverable" style="padding: 8px 24px 14px">
            <template v-for="release in history.data.value?.items ?? []" :key="release.id">
              <div
                class="r"
                role="button"
                @click="opened = opened === release.id ? undefined : release.id"
              >
                <span
                  :class="release.status === RELEASE_STATUSES.MERGED ? 'ok' : 'check'"
                  class="ico-tile"
                  ><UIcon
                    :name="
                      release.status === RELEASE_STATUSES.MERGED
                        ? 'i-lucide-check'
                        : 'i-lucide-git-pull-request'
                    "
                /></span>
                <div class="g-grow">
                  <div class="r-title">
                    {{ day.format(new Date(release.createdAt)) }}
                    {{ clock.format(new Date(release.createdAt)) }} ·
                    {{ counted({ count: release.changes, one: 'text', other: 'texts' }) }}
                  </div>
                  <div class="r-sub">
                    By {{ startedBy(release)
                    }}<template v-if="release.pullRequestNumber">
                      · pull request #{{ release.pullRequestNumber }}</template
                    >
                    ·
                    {{ counted({ count: release.approvals, one: 'approval', other: 'approvals' }) }}
                  </div>
                </div>
                <span class="meta"
                  >{{
                    release.mergedAt
                      ? `merged ${formatTimeAgo(new Date(release.mergedAt))}`
                      : 'open'
                  }}<UIcon
                    :name="
                      opened === release.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
                    "
                    class="chev"
                /></span>
              </div>
              <template v-if="opened === release.id">
                <div
                  v-for="change in changes.data.value?.items ?? []"
                  :key="change.id"
                  class="r"
                  style="padding-left: 48px"
                >
                  <span class="lc plain">{{ change.language }}</span>
                  <div class="g-grow" style="min-width: 0">
                    <div class="r-sub">
                      <AppTextKey
                        :source="keyOfTextId(change.textId).source"
                        :path="keyOfTextId(change.textId).path"
                      />
                    </div>
                    <div class="ellipsis" style="font-size: 13px">
                      <del v-if="change.previousValue" class="muted">{{
                        change.previousValue
                      }}</del>
                      → {{ change.value }}
                    </div>
                  </div>
                  <span
                    v-if="undoBlocked(change) && !change.undone"
                    class="hint"
                    style="max-width: 220px; text-align: right"
                    >{{ undoBlocked(change) }}</span
                  >
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="Boolean(undoBlocked(change))"
                    :title="undoBlocked(change) || 'Put the old text back with the next release'"
                    :class="{
                      'is-loading':
                        undo.isPending.value && undo.variables.value?.changeId === change.id,
                    }"
                    @click.stop="
                      undo.mutate({ projectId, releaseId: release.id, changeId: change.id })
                    "
                  >
                    <UIcon name="i-lucide-undo-2" />{{ change.undone ? 'Undone' : 'Undo' }}
                  </button>
                </div>
              </template>
            </template>
            <div v-if="(history.data.value?.items.length ?? 0) === 0" class="r">
              <div class="g-grow muted">No release yet.</div>
            </div>
          </div>
        </section>
      </div>

      <section class="panel next-rel">
        <div class="row-flex">
          <span class="h3">Next release</span
          ><span v-if="next.data.value" class="pill plain"
            ><UIcon name="i-lucide-clock" />{{ clock.format(next.data.value.nextRunAt) }}</span
          ><span class="g-grow" /><button
            type="button"
            class="btn btn-outline btn-sm"
            :class="{ 'is-loading': run.isPending.value }"
            :disabled="!next.data.value?.ready.changes"
            @click="run.mutate({ projectId })"
          >
            <UIcon name="i-lucide-zap" />Release now
          </button>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="l">Texts</div>
            <div class="v">{{ ready.changes }}</div>
          </div>
          <div class="stat">
            <div class="l">Languages</div>
            <div class="v">{{ ready.languages.length }}</div>
          </div>
          <div class="stat" :title="ready.sources.join(', ')">
            <div class="l">Apps</div>
            <div class="v">{{ ready.sources.length }}</div>
          </div>
        </div>
        <template v-if="ready.languages.length > 0">
          <div class="sbar" role="img" :aria-label="`Approved texts per language`">
            <i
              v-for="entry in ready.languages"
              :key="entry.language"
              :style="{ flex: entry.changes, background: entry.color }"
            />
          </div>
          <div class="legend">
            <span v-for="entry in ready.languages" :key="entry.language"
              ><i class="swatch" :style="{ background: entry.color }" />{{ entry.name }}
              <b>{{ entry.changes }}</b></span
            >
          </div>
        </template>
        <div v-if="ready.items.length > 0" class="rows">
          <div v-for="item in ready.items" :key="`${item.textId}|${item.language}`" class="r">
            <span class="lc plain">{{ item.language }}</span>
            <div class="g-grow" style="min-width: 0">
              <div class="ellipsis">
                <GlotTextValue :value="item.value" :syntax="item.syntax" />
              </div>
              <div class="r-sub">
                <AppTextKey :source="item.key.source" :path="item.key.path.join('.')" />
              </div>
            </div>
            <span v-if="item.authorName" class="meta">{{ item.authorName }}</span>
          </div>
          <div v-if="ready.more > 0" class="r">
            <span class="g-grow muted">{{ ready.more }} more</span>
          </div>
        </div>
        <div v-if="next.data.value?.open" class="rows">
          <div class="r">
            <UIcon name="i-lucide-git-pull-request" class="muted" /><span class="g-grow"
              ><template v-if="next.data.value.open.pullRequestNumber"
                >Pull request #{{ next.data.value.open.pullRequestNumber }}</template
              ><template v-else>The release branch</template> is waiting to merge</span
            ><a
              v-if="next.data.value.open.pullRequestUrl"
              :href="next.data.value.open.pullRequestUrl"
              target="_blank"
              rel="noopener"
              class="meta"
              >Open<UIcon name="i-lucide-arrow-up-right" class="chev"
            /></a>
          </div>
        </div>
      </section>
    </div>
  </AppPage>
</template>
