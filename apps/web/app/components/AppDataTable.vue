<script setup lang="ts" generic="TData extends RowData">
import { FlexRender } from '@tanstack/vue-table'
import type { RowData } from '@tanstack/vue-table'
import type { useAppTable } from '../config/table.config.ts'

defineProps<{
  table: ReturnType<typeof useAppTable<TData>>
  loading?: boolean | undefined
  empty: string
}>()

defineSlots<Record<`cell-${string}`, (props: { row: TData }) => unknown>>()
</script>

<template>
  <table class="w-full border-separate border-spacing-0 text-left">
    <thead>
      <tr v-for="group in table.getHeaderGroups()" :key="group.id">
        <th
          v-for="header in group.headers"
          :key="header.id"
          scope="col"
          class="border-b border-line px-3 pt-3.5 pb-2.5 text-xs font-medium whitespace-nowrap text-ink-3 first:pl-6 last:pr-5"
        >
          <button
            v-if="header.column.getCanSort()"
            type="button"
            class="inline-flex items-center gap-1 hover:text-ink"
            @click="header.column.toggleSorting()"
          >
            <FlexRender :header="header" />
            <UIcon
              v-if="header.column.getIsSorted()"
              :name="
                header.column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
              "
              class="size-3"
            />
          </button>
          <FlexRender v-else-if="!header.isPlaceholder" :header="header" />
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-if="loading">
        <tr v-for="line in [56, 44, 62]" :key="line">
          <td
            v-for="column in table.getAllLeafColumns()"
            :key="column.id"
            class="border-b border-line px-3 py-4 first:pl-6 last:pr-5"
          >
            <USkeleton class="h-3" :style="{ width: `${line}%` }" />
          </td>
        </tr>
      </template>
      <tr v-else-if="table.getRowModel().rows.length === 0">
        <td
          :colspan="table.getAllLeafColumns().length"
          class="px-6 pt-14 pb-16 text-center text-ink-3"
        >
          {{ empty }}
        </td>
      </tr>
      <tr v-for="row in table.getRowModel().rows" v-else :key="row.id" class="group">
        <td
          v-for="cell in row.getAllCells()"
          :key="cell.id"
          class="border-b border-line px-3 py-3 align-middle text-sm text-ink transition-colors duration-[120ms] group-last:border-b-0 group-hover:bg-hover first:pl-6 last:pr-5"
        >
          <slot :name="`cell-${cell.column.id}`" :row="row.original">
            <FlexRender :cell="cell" />
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
