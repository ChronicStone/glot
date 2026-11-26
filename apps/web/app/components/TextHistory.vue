<script setup lang="ts">
import type { Text } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { useQueries } from '@tanstack/vue-query'
import { formatTimeAgo } from '@vueuse/core'

const { text } = defineProps<{ text: Text }>()

const { $api } = useNuxtApp()
const { project } = useCurrentProject()

const comments = useQueries({
  queries: computed(() =>
    text.translations.map(({ language }) => ({
      ...$api.reviews.comments.queryOptions({
        input: { projectId: project.value?.id ?? '', textId: text.id, language },
      }),
      enabled: Boolean(project.value),
    })),
  ),
  combine: (results) => results.flatMap((result) => result.data ?? []),
})

const events = computed(() =>
  [
    ...comments.value.map((comment) => ({
      id: comment.id,
      at: new Date(comment.createdAt),
      person: comment.authorName,
      title: `${comment.authorName} ${comment.kind === 'CHANGE_REQUEST' ? 'asked for a change' : 'commented'} · ${comment.language}`,
      detail: comment.body,
    })),
    ...text.translations.flatMap(({ language, draft }) =>
      draft
        ? [
            {
              id: draft.id,
              at: new Date(draft.updatedAt),
              person: draft.authorName,
              title: `${draft.authorName} ${draft.status === DRAFT_STATUSES.IN_REVIEW ? 'sent a change' : 'is drafting'} · ${language}`,
              detail: draft.value,
            },
          ]
        : [],
    ),
  ].toSorted((left, right) => right.at.getTime() - left.at.getTime()),
)

const approvals = computed(() => text.translations.filter(({ reviewerName }) => reviewerName))
</script>

<template>
  <div class="rows">
    <div
      v-for="event in events"
      :key="event.id"
      class="r"
      style="align-items: flex-start; gap: 12px"
    >
      <AppAvatar :name="event.person" size="sm" />
      <div class="g-grow">
        <div class="r-title" style="font-size: 13px">{{ event.title }}</div>
        <div class="r-sub">{{ event.detail }}</div>
      </div>
      <span class="meta" style="font-size: 12px">{{ formatTimeAgo(event.at) }}</span>
    </div>
    <div
      v-for="translation in approvals"
      :key="translation.language"
      class="r"
      style="align-items: flex-start; gap: 12px"
    >
      <span class="ico-tile ok" style="width: 24px; height: 24px; border-radius: 7px"
        ><UIcon name="i-lucide-check" class="ic-13"
      /></span>
      <div class="g-grow">
        <div class="r-title" style="font-size: 13px; display: flex; gap: 8px; align-items: center">
          {{ translation.reviewerName }} approved {{ languageName(translation.language)
          }}<span
            v-if="translation.selfApproved"
            class="pill warn"
            style="height: 20px; font-size: 11px"
            >Self-approved</span
          >
        </div>
        <div class="r-sub">{{ translation.value }}</div>
      </div>
    </div>
    <div v-if="events.length === 0 && approvals.length === 0" class="empty" style="padding: 32px 0">
      <p>Nothing has happened to this text in Glot yet.</p>
    </div>
  </div>
</template>
