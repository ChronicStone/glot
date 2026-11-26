import { useQuery } from '@tanstack/vue-query'

export function useRights() {
  const { $api } = useNuxtApp()
  const { project } = useCurrentProject()

  const rights = useQuery(() => ({
    ...$api.reviews.rights.queryOptions({ input: { projectId: project.value?.id ?? '' } }),
    enabled: Boolean(project.value),
  }))

  const write = computed(() => rights.data.value?.write ?? [])
  const approve = computed(() => rights.data.value?.approve ?? [])

  return { write, approve }
}
