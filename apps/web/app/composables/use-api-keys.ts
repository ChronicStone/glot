import { queryOptions, useMutation, useQuery } from '@tanstack/vue-query'
import { QUERY_KEYS } from '../constants/queries.constants.ts'

export function useApiKeys() {
  const { $auth, $queryClient } = useNuxtApp()

  const options = queryOptions({
    queryKey: [QUERY_KEYS.API_KEYS],
    queryFn: async () => {
      const { data, error } = await $auth.apiKey.list()

      if (error) {
        throw new Error(error.message)
      }

      return data.apiKeys
    },
  })

  function refresh() {
    return $queryClient.invalidateQueries({ queryKey: options.queryKey })
  }

  const keys = useQuery(options)

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await $auth.apiKey.create({ name })

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: refresh,
  })

  const revoke = useMutation({
    mutationFn: (keyId: string) => $auth.apiKey.delete({ keyId }),
    onSuccess: refresh,
  })

  return { keys, create, revoke }
}
