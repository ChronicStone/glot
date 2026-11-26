import { useQuery } from '@tanstack/vue-query'

export function useCurrentProject() {
  const { $api } = useNuxtApp()
  const route = useRoute()
  const { workspace } = useCurrentWorkspace()
  const all = useQuery($api.projects.list.queryOptions())

  const projects = computed(
    () => all.data.value?.filter(({ workspaceId }) => workspaceId === workspace.value?.id) ?? [],
  )

  const project = computed(
    () => projects.value.find(({ id }) => id === route.params.projectId) ?? projects.value[0],
  )

  return { projects, project }
}
