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
  helper.accessor('languages', { header: 'Languages', enableSorting: false }),
  helper.accessor('expiresAt', { header: 'Access ends', sortUndefined: 'last' }),
  helper.accessor('signedIn', { header: 'Signed in' }),
  helper.display({ id: 'actions', header: '' }),
])

const search = ref<string>('')

const soon = computed(() => Date.now() + 1000 * 60 * 60 * 24 * 30)

const data = computed(() =>
  (people.data.value ?? []).filter(({ user }) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
)

const table = useAppTable({ columns, data, getRowId: (person) => person.id })

function openModal(person: Person | undefined) {
  editing.value = person
  modalOpen.value = true
}
</script>

<template>
  <AppPage title="Settings" scroll>
    <template #pill>
      <span class="pill plain pill-lg"
        ><UIcon name="i-lucide-users" />{{ people.data.value?.length ?? 0 }} people</span
      >
    </template>
    <template #actions>
      <button
        v-if="managesPeople"
        type="button"
        class="btn btn-primary"
        @click="openModal(undefined)"
      >
        <UIcon name="i-lucide-user-plus" />Invite
      </button>
    </template>
    <SettingsTabs />
    <section class="panel">
      <div class="toolbar">
        <label class="input input-soft"
          ><UIcon name="i-lucide-search" /><input
            v-model="search"
            placeholder="Search people"
            aria-label="Search people"
        /></label>
        <div class="right">
          <span class="muted" style="font-size: 13px"
            >Invited people sign in with an email link</span
          >
        </div>
      </div>
      <AppDataTable :table="table" :loading="people.isPending.value" empty="Nobody matches.">
        <template #cell-person="{ row }">
          <div class="who">
            <AppAvatar :name="row.user.name" size="md" />
            <div>
              <div class="n">{{ row.user.name }}</div>
              <div class="e">{{ row.user.email }}</div>
            </div>
          </div>
        </template>
        <template #cell-role="{ row }">
          <button
            type="button"
            class="role-btn"
            :disabled="!managesPeople || row.user.id === session.data?.user.id"
            @click="openModal(row)"
          >
            {{ ROLE_LABELS[row.role] }}<UIcon name="i-lucide-chevron-down" />
          </button>
        </template>
        <template #cell-languages="{ row }">
          <div class="langs">
            <span v-if="row.languages === null" class="muted" style="font-size: 13px"
              >All languages</span
            >
            <span v-for="language in row.languages ?? []" :key="language" class="lc plain">{{
              language
            }}</span>
          </div>
        </template>
        <template #cell-expiresAt="{ row }">
          <span v-if="row.expiresAt && row.expiresAt.getTime() < soon" class="pill warn"
            ><UIcon name="i-lucide-clock" />{{ dateFormat.format(row.expiresAt) }}</span
          >
          <span v-else-if="row.expiresAt" class="when">{{ dateFormat.format(row.expiresAt) }}</span>
          <span v-else class="faint">—</span>
        </template>
        <template #cell-signedIn="{ row }">
          <span v-if="row.signedIn" class="when">Yes</span>
          <span v-else class="pill plain">Not yet</span>
        </template>
        <template #cell-actions="{ row }">
          <button
            v-if="managesPeople && row.user.id !== session.data?.user.id"
            type="button"
            class="btn btn-ghost btn-sm btn-icon"
            aria-label="Change access"
            @click="openModal(row)"
          >
            <UIcon name="i-lucide-ellipsis" />
          </button>
        </template>
      </AppDataTable>
    </section>
    <PersonModal
      v-if="workspace"
      :key="editing?.id ?? 'new'"
      v-model:open="modalOpen"
      :person="editing"
      :workspace-id="workspace.id"
    />
  </AppPage>
</template>
