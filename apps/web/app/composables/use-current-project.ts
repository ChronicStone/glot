import { useQuery } from '@tanstack/vue-query'

export function useCurrentProject() {
  const { $api } = useNuxtApp()
  const route = useRoute()
  const projects = useQuery($api.projects.list.queryOptions())

  const project = computed(
    () =>
      projects.data.value?.find(({ id }) => id === route.params.projectId) ??
      projects.data.value?.[0],
  )

  return { projects, project }
}
