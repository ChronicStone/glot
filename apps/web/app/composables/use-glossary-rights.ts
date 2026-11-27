import type { GlossaryTerm } from '@glot/contract'
import { useQuery } from '@tanstack/vue-query'

export function useGlossaryRights() {
  const { $api } = useNuxtApp()
  const { workspace } = useCurrentWorkspace()

  const rights = useQuery(() => ({
    ...$api.glossary.rights.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
    enabled: Boolean(workspace.value),
  }))

  const suggests = computed(() => rights.data.value?.suggest ?? false)
  const languages = computed(() => rights.data.value?.languages ?? [])

  function decides(concept: GlossaryTerm) {
    return (
      suggests.value &&
      Object.keys(concept.terms).every((language) => languages.value.includes(language))
    )
  }

  return { suggests, languages, decides }
}
