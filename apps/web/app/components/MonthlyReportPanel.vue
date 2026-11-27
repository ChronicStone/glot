<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { createAppColumnHelper, useAppTable } from '../config/table.config.ts'

const { workspaceId } = defineProps<{ workspaceId: string }>()

const { $api } = useNuxtApp()
const count = new Intl.NumberFormat('en')
const monthLabel = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const months = computed(() => {
  const now = new Date()

  return [0, 1, 2].map((back) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))

    return { value: date.toISOString().slice(0, 7), label: monthLabel.format(date) }
  })
})

const month = ref<string>(months.value[0]?.value ?? '')

const report = useQuery(() =>
  $api.reports.monthly.queryOptions({ input: { workspaceId, month: month.value } }),
)

const data = computed(() => report.data.value?.people ?? [])
const helper = createAppColumnHelper<(typeof data.value)[number]>()

const columns = helper.columns([
  helper.accessor((person) => person.user.name, { id: 'person', header: 'Person' }),
  helper.accessor((person) => person.written.words, { id: 'written', header: 'Words written' }),
  helper.accessor((person) => person.reviewed.words, { id: 'reviewed', header: 'Words reviewed' }),
])

const table = useAppTable({ columns, data, getRowId: (person) => person.user.id })
</script>

<template>
  <section class="panel">
    <div class="panel-h">
      <h3>Words per person</h3>
      <AppSegmented v-model="month" :items="months" small />
    </div>
    <AppDataTable
      class="ptbl"
      :table="table"
      :loading="report.isPending.value"
      empty="Nobody wrote or reviewed a text this month."
    >
      <template #cell-person="{ row }">
        <div class="who">
          <AppAvatar :name="row.user.name" size="md" />
          <div>
            <div class="n">{{ row.user.name }}</div>
            <div class="e">{{ row.languages.map(({ language }) => language).join(' · ') }}</div>
          </div>
        </div>
      </template>
      <template #cell-written="{ row }">
        <span class="mono">{{ count.format(row.written.words) }}</span>
        <span class="muted" style="font-size: 12px">
          · {{ count.format(row.written.texts) }} texts</span
        >
      </template>
      <template #cell-reviewed="{ row }">
        <span class="mono">{{ count.format(row.reviewed.words) }}</span>
        <span class="muted" style="font-size: 12px">
          · {{ count.format(row.reviewed.texts) }} texts</span
        >
      </template>
    </AppDataTable>
    <div
      v-if="report.data.value && data.length > 0"
      class="row-flex muted"
      style="font-size: 13px; padding: 12px 24px 16px"
    >
      In total {{ count.format(report.data.value.totals.written.words) }} words written and
      {{ count.format(report.data.value.totals.reviewed.words) }} reviewed. Own changes a reviewer
      approved count as written only.
    </div>
  </section>
</template>
