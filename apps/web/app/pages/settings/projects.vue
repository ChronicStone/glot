<script setup lang="ts">
import type { ProjectView } from '@glot/contract'
import { useMutation, useQueries } from '@tanstack/vue-query'
import { createAppColumnHelper, useAppTable } from '../../config/table.config.ts'

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const { projects } = useCurrentProject()
const { workspace } = useCurrentWorkspace()
const { managesPeople } = useAccess()
const editing = ref<ProjectView | undefined>()
const editorOpen = ref<boolean>(false)

const totals = useQueries({
  queries: computed(() =>
    projects.value.map((project) => ({
      ...$api.texts.search.queryOptions({ input: { projectId: project.id, limit: 1 } }),
    })),
  ),
  combine: (results) => results.map((result) => result.data?.total),
})

const helper = createAppColumnHelper<ProjectView>()

const columns = helper.columns([
  helper.accessor('name', { header: 'Project' }),
  helper.accessor((project) => project.sources.length, { id: 'sources', header: 'Sources' }),
  helper.accessor('languages', { header: 'Languages', enableSorting: false }),
  helper.accessor((project) => project.apps.map(({ name }) => name).join(', '), {
    id: 'apps',
    header: 'Apps',
  }),
  helper.display({ id: 'texts', header: 'Texts' }),
  helper.display({ id: 'actions', header: '' }),
])

const table = useAppTable({ columns, data: projects, getRowId: (project) => project.id })

const sync = useMutation(
  $api.projects.sync.mutationOptions({
    onSuccess: async ({ texts, commit }) => {
      toast.add({
        title: `Read ${texts.toLocaleString('en-US')} texts`,
        description: `Commit ${commit.slice(0, 7)}`,
        color: 'success',
      })

      await $queryClient.invalidateQueries({ queryKey: $api.texts.key() })
    },
    onError: (error) => toast.add({ title: error.message, color: 'error' }),
  }),
)

function edit(project: ProjectView | undefined) {
  editing.value = project
  editorOpen.value = true
}
</script>

<template>
  <AppPage title="Settings" scroll>
    <template #actions>
      <button v-if="managesPeople" type="button" class="btn btn-primary" @click="edit(undefined)">
        <UIcon name="i-lucide-plus" />New project
      </button>
    </template>
    <SettingsTabs />
    <section class="panel">
      <AppDataTable :table="table" :loading="false" empty="No project yet.">
        <template #cell-name="{ row }">
          <div class="who">
            <span class="ptile check" style="width: 32px; height: 32px; border-radius: 10px"
              ><UIcon name="i-lucide-layers"
            /></span>
            <div>
              <div class="n">{{ row.name }}</div>
              <div class="e mono">{{ row.sources.map(({ name }) => name).join(' · ') }}</div>
            </div>
          </div>
        </template>
        <template #cell-languages="{ row }">
          <div class="langs">
            <span v-for="language in row.languages" :key="language" class="lc plain">{{
              language
            }}</span>
          </div>
        </template>
        <template #cell-apps="{ row }">
          <span class="when">{{ row.apps.map(({ name }) => name).join(', ') }}</span>
        </template>
        <template #cell-texts="{ row }">
          <span class="num">{{
            totals[projects.indexOf(row)]?.toLocaleString('en-US') ?? '—'
          }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="row-flex" style="justify-content: flex-end; gap: 4px">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :class="{
                'is-loading': sync.isPending.value && sync.variables.value?.projectId === row.id,
              }"
              @click="sync.mutate({ projectId: row.id })"
            >
              <UIcon name="i-lucide-refresh-cw" />Read now
            </button>
            <button
              v-if="managesPeople"
              type="button"
              class="btn btn-ghost btn-sm btn-icon"
              aria-label="Edit"
              @click="edit(row)"
            >
              <UIcon name="i-lucide-ellipsis" />
            </button>
          </div>
        </template>
      </AppDataTable>
    </section>
    <ProjectEditor
      v-if="workspace"
      :key="editing?.id ?? 'new'"
      v-model:open="editorOpen"
      :project="editing"
      :workspace-id="workspace.id"
    />
  </AppPage>
</template>
