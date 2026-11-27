<script setup lang="ts">
import { createAppColumnHelper, useAppTable } from '../../config/table.config.ts'

const { keys, revoke } = useApiKeys()
const modalOpen = ref<boolean>(false)
const revoking = ref<{ id: string; name: string } | undefined>()

const revokeOpen = computed({
  get: () => Boolean(revoking.value),
  set: (open: boolean) => {
    if (!open) {
      revoking.value = undefined
    }
  },
})

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
const data = computed(() => keys.data.value ?? [])
const helper = createAppColumnHelper<(typeof data.value)[number]>()

const columns = helper.columns([
  helper.accessor('name', { header: 'Key' }),
  helper.accessor('createdAt', { header: 'Created' }),
  helper.accessor('lastRequest', { header: 'Last used', sortUndefined: 'last' }),
  helper.display({ id: 'actions', header: '' }),
])

const table = useAppTable({ columns, data, getRowId: (key) => key.id })
</script>

<template>
  <AppPage title="Settings" scroll>
    <template #actions>
      <button type="button" class="btn btn-primary" @click="modalOpen = true">
        <UIcon name="i-lucide-plus" />Create a key
      </button>
    </template>
    <SettingsTabs />
    <section class="panel">
      <div v-if="!keys.isPending.value && data.length === 0" class="empty">
        <span class="ico-tile"><UIcon name="i-lucide-key-round" /></span>
        <div class="h3">No API keys</div>
        <p>
          Keys let CI, scripts and coding agents read texts, add French and ask for AI fills. They
          can never approve or release.
        </p>
        <div class="row-flex">
          <button type="button" class="btn btn-primary btn-sm" @click="modalOpen = true">
            <UIcon name="i-lucide-plus" />Create a key
          </button>
        </div>
      </div>
      <AppDataTable
        class="ptbl"
        v-else
        :table="table"
        :loading="keys.isPending.value"
        empty="No key yet."
      >
        <template #cell-name="{ row }">
          <div class="who">
            <span class="ico-tile"><UIcon name="i-lucide-key-round" /></span>
            <div>
              <div class="n">{{ row.name }}</div>
              <div class="e mono">{{ row.start }}••••</div>
            </div>
          </div>
        </template>
        <template #cell-createdAt="{ row }">
          <span class="when">{{ dateFormat.format(new Date(row.createdAt)) }}</span>
        </template>
        <template #cell-lastRequest="{ row }">
          <span class="when">{{
            row.lastRequest ? dateFormat.format(new Date(row.lastRequest)) : 'Never'
          }}</span>
        </template>
        <template #cell-actions="{ row }">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            style="color: var(--glot-fix)"
            @click="revoking = { id: row.id, name: row.name ?? 'this key' }"
          >
            Revoke
          </button>
        </template>
      </AppDataTable>
    </section>
    <div class="row-flex muted" style="font-size: 13px; padding: 14px 8px">
      <UIcon name="i-lucide-shield-check" class="ic-14" />Keys never approve or release, whichever
      surface they use: /api/v1, /mcp.
    </div>
    <KeyModal v-model:open="modalOpen" />
    <AppDialog
      v-model:open="revokeOpen"
      :title="`Revoke “${revoking?.name}”?`"
      description="Calls with this key fail at once."
      icon="i-lucide-key-round"
      tone="fix"
    >
      <template #footer>
        <span class="g-grow" />
        <button type="button" class="btn btn-ghost" @click="revoking = undefined">Keep it</button>
        <button
          type="button"
          class="btn btn-danger"
          :class="{ 'is-loading': revoke.isPending.value }"
          @click="
            revoking && revoke.mutate(revoking.id, { onSuccess: () => (revoking = undefined) })
          "
        >
          Revoke key
        </button>
      </template>
    </AppDialog>
  </AppPage>
</template>
