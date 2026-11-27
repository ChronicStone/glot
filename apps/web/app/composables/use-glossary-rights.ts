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
  const anyLanguage = computed(() => rights.data.value?.anyLanguage ?? false)
  const languages = computed(() => rights.data.value?.languages ?? [])

  function mayChange(language: string) {
    return suggests.value && (anyLanguage.value || languages.value.includes(language))
  }

  function decides(concept: GlossaryTerm) {
    return suggests.value && Object.keys(concept.terms).every(mayChange)
  }

  return { suggests, anyLanguage, languages, mayChange, decides }
}
