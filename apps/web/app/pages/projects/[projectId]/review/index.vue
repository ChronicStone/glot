<script setup lang="ts">
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { keepPreviousData, useInfiniteQuery, useMutation } from '@tanstack/vue-query'
import { REVIEW_REASON_LABELS } from '../../../../constants/review.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useCurrentProject()
const { approve } = useRights()

const language = computed(() => {
  const asked = typeof route.query.language === 'string' ? route.query.language : undefined

  return asked && approve.value.includes(asked) ? asked : approve.value[0]
})

const queue = useInfiniteQuery(() => ({
  ...$api.reviews.queue.infiniteOptions({
    input: (cursor: string | undefined) => ({
      projectId: project.value?.id ?? '',
      language: language.value ?? '',
      cursor,
    }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  }),
  enabled: Boolean(project.value && language.value),
  placeholderData: keepPreviousData,
}))

const items = computed(() => queue.data.value?.pages.flatMap((page) => page.items) ?? [])
const total = computed(() => queue.data.value?.pages[0]?.total ?? 0)
const identical = computed(() => queue.data.value?.pages[0]?.sameElsewhere ?? 0)

const approveIdentical = useMutation({
  mutationFn: () =>
    $api.reviews.approveSame.call({
      projectId: project.value?.id ?? '',
      language: language.value ?? '',
    }),
  onSuccess: async ({ approved }) => {
    toast.add({ title: `${approved} approved`, color: 'success', icon: 'i-lucide-check' })

    await Promise.all([
      $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
      $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
    ])
  },
  onError: (error) => toast.add({ title: error.message, color: 'error' }),
})

function sessionPath(textId?: string) {
  return {
    path: `/projects/${project.value?.id}/review/${language.value}`,
    ...(textId ? { query: { text: textId } } : {}),
  }
}

function currentValue(item: (typeof items.value)[number]) {
  return (
    item.draft?.value ??
    item.text.translations.find((translation) => translation.language === item.language)?.value ??
    ''
  )
}
</script>

<template>
  <AppPage id="review" title="Review">
    <template #actions>
      <UButton
        v-if="identical > 0"
        :label="`Approve ${identical} identical`"
        color="neutral"
        variant="outline"
        :loading="approveIdentical.isPending.value"
        @click="approveIdentical.mutate()"
      />
      <UButton
        v-if="total > 0"
        label="Start session"
        icon="i-lucide-play"
        color="neutral"
        :to="sessionPath()"
      />
    </template>
    <template #toolbar>
      <div
        v-if="approve.length > 0"
        class="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6"
      >
        <UButton
          v-for="code in approve"
          :key="code"
          :label="languageName(code)"
          size="sm"
          :color="code === language ? 'primary' : 'neutral'"
          :variant="code === language ? 'soft' : 'ghost'"
          class="shrink-0 rounded-full"
          :to="{ query: { language: code } }"
          replace
        />
      </div>
    </template>
    <p v-if="approve.length === 0" class="py-10 text-center text-muted">
      You do not review any language of this project.
    </p>
    <p
      v-else-if="items.length === 0 && !queue.isPending.value"
      class="py-10 text-center text-muted"
    >
      Nothing to review in {{ language ? languageName(language) : '' }}.
    </p>
    <ul class="-mx-4 -my-4 divide-y divide-default sm:-mx-6 sm:-my-6">
      <li v-for="item in items" :key="`${item.text.id}-${item.draft?.id ?? ''}`">
        <NuxtLink
          :to="sessionPath(item.text.id)"
          class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/60 sm:px-6 md:grid-cols-[1fr_1fr_auto_auto]"
        >
          <GlotTextValue :value="item.text.source.value" class="truncate text-[13.5px]" />
          <GlotTextValue
            :value="currentValue(item)"
            class="col-span-2 truncate text-[13.5px] text-muted md:col-span-1"
          />
          <UBadge
            :label="REVIEW_REASON_LABELS[item.reason]"
            color="neutral"
            variant="subtle"
            class="col-start-2 row-start-1 md:col-start-auto md:row-start-auto"
          />
          <span class="hidden w-16 text-right text-xs text-muted md:block">{{
            item.text.shownIn.length === 1
              ? item.text.shownIn[0]
              : `${item.text.shownIn.length} apps`
          }}</span>
        </NuxtLink>
      </li>
      <li v-if="queue.hasNextPage.value" class="px-4 py-3 sm:px-6">
        <UButton
          label="Show more"
          color="neutral"
          variant="ghost"
          :loading="queue.isFetchingNextPage.value"
          @click="queue.fetchNextPage()"
        />
      </li>
    </ul>
  </AppPage>
</template>
