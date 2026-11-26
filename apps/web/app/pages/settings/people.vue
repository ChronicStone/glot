<script setup lang="ts">
import type { Person } from '@glot/contract'
import { useQuery } from '@tanstack/vue-query'
import { ROLE_LABELS } from '../../constants/people.constants.ts'

const { $api } = useNuxtApp()
const { workspace } = useCurrentWorkspace()
const { managesPeople } = useAccess()
const session = useNuxtApp().$auth.useSession()
const editing = ref<Person | undefined>(undefined)
const modalOpen = ref<boolean>(false)

const people = useQuery(
  computed(() => ({
    ...$api.people.list.queryOptions({ input: { workspaceId: workspace.value?.id ?? '' } }),
    enabled: Boolean(workspace.value),
  })),
)

const columns = [
  { accessorKey: 'user', header: 'Person' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'languages', header: 'Languages they change' },
  { accessorKey: 'expiresAt', header: 'Access' },
  { id: 'actions', header: '' },
]

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

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
    <UTable
      :data="people.data.value ?? []"
      :columns="columns"
      :loading="people.isPending.value"
      class="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6"
      :ui="{ th: 'font-normal text-muted text-xs', td: 'py-3' }"
    >
      <template #user-cell="{ row }">
        <UUser
          :name="row.original.user.name"
          :description="
            row.original.signedIn
              ? row.original.user.email
              : `${row.original.user.email} · not signed in yet`
          "
          :avatar="{ alt: row.original.user.name }"
        />
      </template>
      <template #role-cell="{ row }">
        {{ ROLE_LABELS[row.original.role] }}
      </template>
      <template #languages-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="language in row.original.languages ?? ['all']"
            :key="language"
            :label="language"
            color="primary"
            variant="soft"
            class="font-mono"
          />
        </div>
      </template>
      <template #expiresAt-cell="{ row }">
        <span class="text-muted">{{
          row.original.expiresAt ? `Until ${dateFormat.format(row.original.expiresAt)}` : 'Ongoing'
        }}</span>
      </template>
      <template #actions-cell="{ row }">
        <UButton
          v-if="managesPeople && row.original.user.id !== session.data?.user.id"
          icon="i-lucide-pencil"
          aria-label="Change access"
          color="neutral"
          variant="ghost"
          @click="openModal(row.original)"
        />
      </template>
    </UTable>
    <PersonModal
      v-if="workspace"
      :key="editing?.id ?? 'new'"
      v-model:open="modalOpen"
      :person="editing"
      :workspace-id="workspace.id"
    />
  </AppPage>
</template>
