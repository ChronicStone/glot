import { useQueries } from '@tanstack/vue-query'

export function useReviewTotal() {
  const { $api } = useNuxtApp()
  const { project } = useCurrentProject()
  const { approve } = useRights()

  return useQueries({
    queries: computed(() =>
      approve.value.map((language) => ({
        ...$api.reviews.queue.queryOptions({
          input: { projectId: project.value?.id ?? '', language, limit: 1 },
        }),
        enabled: Boolean(project.value),
      })),
    ),
    combine: (results) => results.reduce((sum, result) => sum + (result.data?.total ?? 0), 0),
  })
}
