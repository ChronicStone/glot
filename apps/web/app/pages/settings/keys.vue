<script setup lang="ts">
import { useMutation, useQuery } from '@tanstack/vue-query'
import { QUERY_KEYS } from '../../constants/queries.constants.ts'

const { $auth, $queryClient } = useNuxtApp()
const modalOpen = ref<boolean>(false)
const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

const keys = useQuery({
  queryKey: [QUERY_KEYS.API_KEYS],
  queryFn: async () => (await $auth.apiKey.list()).data?.apiKeys ?? [],
})

const revoke = useMutation({
  mutationFn: (keyId: string) => $auth.apiKey.delete({ keyId }),
  onSuccess: () => $queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] }),
})

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'start', header: 'Key' },
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'lastRequest', header: 'Last used' },
  { id: 'actions', header: '' },
]
</script>

<template>
  <AppPage id="settings-keys" title="Settings">
    <template #actions>
      <UButton icon="i-lucide-plus" label="New key" color="neutral" @click="modalOpen = true" />
    </template>
    <template #toolbar>
      <SettingsTabs />
    </template>
    <UTable
      :data="keys.data.value ?? []"
      :columns="columns"
      :loading="keys.isPending.value"
      empty="No key yet."
      class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
      :ui="{ th: 'font-normal text-muted text-xs', td: 'py-3' }"
    >
      <template #name-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.name }}</span>
      </template>
      <template #start-cell="{ row }">
        <span class="font-mono text-muted">{{ row.original.start }}…</span>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="text-muted">{{ dateFormat.format(new Date(row.original.createdAt)) }}</span>
      </template>
      <template #lastRequest-cell="{ row }">
        <span class="text-muted">{{
          row.original.lastRequest ? dateFormat.format(new Date(row.original.lastRequest)) : 'Never'
        }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          label="Revoke"
          color="error"
          variant="ghost"
          size="sm"
          :loading="revoke.isPending.value && revoke.variables.value === row.original.id"
          @click="revoke.mutate(row.original.id)"
        />
      </template>
    </UTable>
    <KeyModal v-model:open="modalOpen" />
  </AppPage>
</template>
