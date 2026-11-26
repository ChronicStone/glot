<script setup lang="ts">
import { createAppColumnHelper, useAppTable } from '../../config/table.config.ts'

const { keys, revoke } = useApiKeys()
const modalOpen = ref<boolean>(false)
const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
const data = computed(() => keys.data.value ?? [])
const helper = createAppColumnHelper<(typeof data.value)[number]>()

const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('start', { header: 'Key', enableSorting: false }),
  helper.accessor('createdAt', { header: 'Created' }),
  helper.accessor('lastRequest', { header: 'Last used', sortUndefined: 'last' }),
  helper.display({ id: 'actions', header: '' }),
])

const table = useAppTable({ columns, data, getRowId: (key) => key.id })
</script>

<template>
  <AppPage id="settings-keys" title="Settings">
    <template #actions>
      <UButton icon="i-lucide-plus" label="New key" color="neutral" @click="modalOpen = true" />
    </template>
    <template #toolbar>
      <SettingsTabs />
    </template>
    <AppDataTable
      :table="table"
      :loading="keys.isPending.value"
      empty="No key yet."
      class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
    >
      <template #cell-name="{ row }">
        <span class="font-medium text-highlighted">{{ row.name }}</span>
      </template>
      <template #cell-start="{ row }">
        <span class="font-mono text-muted">{{ row.start }}…</span>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted">{{ dateFormat.format(new Date(row.createdAt)) }}</span>
      </template>
      <template #cell-lastRequest="{ row }">
        <span class="text-muted">{{
          row.lastRequest ? dateFormat.format(new Date(row.lastRequest)) : 'Never'
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <UButton
          label="Revoke"
          color="error"
          variant="ghost"
          size="sm"
          :loading="revoke.isPending.value && revoke.variables.value === row.id"
          @click="revoke.mutate(row.id)"
        />
      </template>
    </AppDataTable>
    <KeyModal v-model:open="modalOpen" />
  </AppPage>
</template>
