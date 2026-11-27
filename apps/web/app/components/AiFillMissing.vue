<script setup lang="ts">
import { AI_FILL_STATUSES } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/vue-query'
import { API_ERROR_CODES } from '../constants/api.constants.ts'
import { AI_FILL_POLL_MS, AI_FILL_SCAN_PAGE } from '../constants/texts.constants.ts'

const { projectId, language } = defineProps<{ projectId: string; language: string }>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const watched = ref<string | undefined>()

function running(status: string) {
  return status === AI_FILL_STATUSES.QUEUED || status === AI_FILL_STATUSES.RUNNING
}

const fills = useQuery(() => ({
  ...$api.ai.fills.queryOptions({ input: { projectId } }),
  refetchInterval: (query) =>
    query.state.data?.some(({ status }) => running(status)) ? AI_FILL_POLL_MS : false,
}))

const missingTexts = useInfiniteQuery(() => ({
  ...$api.texts.search.infiniteOptions({
    input: (cursor: string | undefined) => ({
      projectId,
      language,
      state: TEXT_STATES.MISSING,
      limit: AI_FILL_SCAN_PAGE,
      cursor,
    }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  }),
}))

watch(
  () => missingTexts.data.value?.pages.length,
  async () => {
    if (missingTexts.hasNextPage.value && !missingTexts.isFetchingNextPage.value) {
      await missingTexts.fetchNextPage()
    }
  },
  { immediate: true },
)

const fillable = computed(
  () =>
    missingTexts.data.value?.pages
      .flatMap(({ items }) => items)
      .filter((text) =>
        text.translations.some(
          (translation) =>
            translation.language === language &&
            translation.state === TEXT_STATES.MISSING &&
            !translation.draft,
        ),
      ).length ?? 0,
)

const current = computed(() =>
  fills.data.value?.find((fill) => fill.language === language && running(fill.status)),
)

const finished = computed(() =>
  fills.data.value?.find((fill) => fill.id === watched.value && !running(fill.status)),
)

const start = useMutation(
  $api.ai.fillMissing.mutationOptions({
    onSuccess: async (fill) => {
      watched.value = fill.id
      await $queryClient.invalidateQueries({ queryKey: $api.ai.fills.key() })
    },
    onError: (error) =>
      errorCode(error) === API_ERROR_CODES.CONFLICT
        ? toast.add({ title: error.message, icon: 'i-lucide-info', color: 'neutral' })
        : toast.add({ title: error.message, icon: 'i-lucide-circle-alert', color: 'error' }),
  }),
)

watch(current, (fill) => {
  if (fill) {
    watched.value = fill.id
  }
})

watch(finished, async (fill) => {
  if (!fill) {
    return
  }

  watched.value = undefined

  const name = languageName(fill.language)
  const refused = fill.rejected > 0 ? ` · ${fill.rejected} left out` : ''

  if (fill.status === AI_FILL_STATUSES.FAILED) {
    toast.add({ title: `AI could not fill ${name}`, icon: 'i-lucide-circle-alert', color: 'error' })
  } else {
    toast.add({
      title: `${fill.filled} ${name} ${fill.filled === 1 ? 'text' : 'texts'} sent for review${refused}`,
      ...(fill.reason ? { description: fill.reason.message } : {}),
      icon: 'i-lucide-sparkle',
      color: fill.status === AI_FILL_STATUSES.PARTIAL ? 'warning' : 'success',
    })
  }

  await Promise.all([
    $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
    $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
  ])
})
</script>

<template>
  <button v-if="current" type="button" class="btn btn-ai is-filling" disabled>
    <UIcon name="i-lucide-loader-circle" class="animate-spin" />{{
      current.status === AI_FILL_STATUSES.QUEUED
        ? 'Starting…'
        : `${current.filled + current.rejected} of ${current.total}`
    }}
  </button>
  <button
    v-else-if="fillable > 0"
    type="button"
    class="btn btn-ai"
    :class="{ 'is-loading': start.isPending.value }"
    :title="`Write the ${fillable} missing ${languageName(language)} texts that have no draft yet with AI and send them for review`"
    @click="start.mutate({ projectId, language })"
  >
    <UIcon name="i-lucide-sparkle" />Fill {{ fillable.toLocaleString('en-US') }} missing
  </button>
</template>
