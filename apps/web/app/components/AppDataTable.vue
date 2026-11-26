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
          class="border-b border-default px-4 py-2.5 text-xs font-normal text-muted first:pl-6 last:pr-6"
        >
          <button
            v-if="header.column.getCanSort()"
            type="button"
            class="inline-flex items-center gap-1 hover:text-highlighted"
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
      <tr v-if="loading">
        <td :colspan="table.getAllLeafColumns().length" class="px-6 py-10">
          <USkeleton class="h-4 w-48" />
        </td>
      </tr>
      <tr v-else-if="table.getRowModel().rows.length === 0">
        <td :colspan="table.getAllLeafColumns().length" class="px-6 py-10 text-center text-muted">
          {{ empty }}
        </td>
      </tr>
      <tr v-for="row in table.getRowModel().rows" v-else :key="row.id" class="group">
        <td
          v-for="cell in row.getAllCells()"
          :key="cell.id"
          class="border-b border-default px-4 py-3 align-middle first:pl-6 last:pr-6 group-hover:bg-muted/60"
        >
          <slot :name="`cell-${cell.column.id}`" :row="row.original">
            <FlexRender :cell="cell" />
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
