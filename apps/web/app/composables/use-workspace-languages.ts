export function useWorkspaceLanguages() {
  const { projects } = useCurrentProject()

  return computed(() =>
    [...new Set(projects.value.flatMap(({ languages }) => languages))].toSorted(),
  )
}
