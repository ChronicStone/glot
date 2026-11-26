import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { useQuery } from '@tanstack/vue-query'

export function useAccess() {
  const { $api } = useNuxtApp()
  const { workspace } = useCurrentWorkspace()

  const access = useQuery(() => ({
    ...$api.people.me.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
    enabled: Boolean(workspace.value),
  }))

  const managesPeople = computed(() =>
    [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN].some((role) => role === access.data.value?.role),
  )

  return { access, managesPeople }
}
