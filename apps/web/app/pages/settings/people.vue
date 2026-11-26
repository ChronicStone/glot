<script setup lang="ts">
import type { Person } from '@glot/contract'
import { useQuery } from '@tanstack/vue-query'
import { createAppColumnHelper, useAppTable } from '../../config/table.config.ts'
import { ROLE_LABELS } from '../../constants/people.constants.ts'

const { $api, $auth } = useNuxtApp()
const { workspace } = useCurrentWorkspace()
const { managesPeople } = useAccess()
const session = $auth.useSession()
const editing = ref<Person | undefined>(undefined)
const modalOpen = ref<boolean>(false)

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const people = useQuery(() => ({
  ...$api.people.list.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
  enabled: Boolean(workspace.value),
}))

const helper = createAppColumnHelper<Person>()

const columns = helper.columns([
  helper.accessor((person) => person.user.name, { id: 'person', header: 'Person' }),
  helper.accessor('role', { header: 'Role', cell: (cell) => ROLE_LABELS[cell.getValue()] }),
  helper.accessor('languages', { header: 'Languages they change', enableSorting: false }),
  helper.accessor('expiresAt', { header: 'Access', sortUndefined: 'last' }),
  helper.display({ id: 'actions', header: '' }),
])

const data = computed(() => people.data.value ?? [])
const table = useAppTable({ columns, data, getRowId: (person) => person.id })

function openModal(person: Person | undefined) {
  editing.value = person
  modalOpen.value = true
}
</script>

<template>
  <AppPage id="settings-people" title="Settings">
    <template #actions>
      <UButton
        v-if="managesPeople"
        icon="i-lucide-plus"
        label="Invite"
        color="neutral"
        @click="openModal(undefined)"
      />
    </template>
    <template #toolbar>
      <SettingsTabs />
    </template>
    <AppDataTable
      :table="table"
      :loading="people.isPending.value"
      empty="Nobody yet."
      class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
    >
      <template #cell-person="{ row }">
        <UUser
          :name="row.user.name"
          :description="row.signedIn ? row.user.email : `${row.user.email} · not signed in yet`"
          :avatar="{ alt: row.user.name }"
        />
      </template>
      <template #cell-languages="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="language in row.languages ?? ['all']"
            :key="language"
            :label="language"
            color="primary"
            variant="soft"
            class="font-mono"
          />
        </div>
      </template>
      <template #cell-expiresAt="{ row }">
        <span class="text-muted">{{
          row.expiresAt ? `Until ${dateFormat.format(row.expiresAt)}` : 'Ongoing'
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <UButton
          v-if="managesPeople && row.user.id !== session.data?.user.id"
          icon="i-lucide-pencil"
          aria-label="Change access"
          color="neutral"
          variant="ghost"
          @click="openModal(row)"
        />
      </template>
    </AppDataTable>
    <PersonModal
      v-if="workspace"
      :key="editing?.id ?? 'new'"
      v-model:open="modalOpen"
      :person="editing"
      :workspace-id="workspace.id"
    />
  </AppPage>
</template>
