import { TEXT_STATES } from '@glot/database/constants/texts'
import { useQueries } from '@tanstack/vue-query'

export function useTextStateCounts() {
  const { $api } = useNuxtApp()
  const { project } = useCurrentProject()

  const languages = computed(
    () =>
      project.value?.languages.filter((language) => language !== project.value?.sourceLanguage) ??
      [],
  )

  const cells = computed(() => [
    { language: undefined, state: undefined },
    ...[undefined, ...languages.value].flatMap((language) =>
      [TEXT_STATES.NEEDS_FIX, TEXT_STATES.TO_CHECK, TEXT_STATES.MISSING].map((state) => ({
        language,
        state,
      })),
    ),
  ])

  return useQueries({
    queries: computed(() =>
      cells.value.map(({ language, state }) => ({
        ...$api.texts.search.queryOptions({
          input: { projectId: project.value?.id ?? '', language, state, limit: 1 },
        }),
        enabled: Boolean(project.value),
      })),
    ),
    combine: (results) => {
      const total = count(0)

      function count(index: number) {
        return results[index]?.data?.total ?? 0
      }

      function countsFrom(offset: number) {
        const pending = count(offset) + count(offset + 1) + count(offset + 2)

        return {
          [TEXT_STATES.NEEDS_FIX]: count(offset),
          [TEXT_STATES.TO_CHECK]: count(offset + 1),
          [TEXT_STATES.MISSING]: count(offset + 2),
          [TEXT_STATES.REVIEWED]: Math.max(0, total - pending),
        }
      }

      return {
        total,
        states: countsFrom(1),
        byLanguage: languages.value.map((language, row) => ({
          language,
          counts: countsFrom(4 + row * 3),
        })),
        ready: results.length > 0 && results.every((result) => result.isSuccess),
      }
    },
  })
}
