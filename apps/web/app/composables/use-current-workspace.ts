export function useCurrentWorkspace() {
  const { $auth } = useNuxtApp()
  const workspaces = $auth.useListOrganizations()
  const session = $auth.useSession()

  const workspace = computed(
    () =>
      workspaces.value.data?.find(
        ({ id }) => id === session.value.data?.session.activeOrganizationId,
      ) ?? workspaces.value.data?.[0],
  )

  return { workspaces, workspace }
}
