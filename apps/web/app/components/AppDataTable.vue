<script setup lang="ts" generic="TData extends RowData">
import { FlexRender } from '@tanstack/vue-table'
import type { RowData } from '@tanstack/vue-table'
import type { useAppTable } from '../config/table.config.ts'

defineProps<{
  table: ReturnType<typeof useAppTable<TData>>
  loading?: boolean | undefined
  empty: string
  selectedId?: string | undefined
}>()

const emit = defineEmits<{ select: [rowId: string] }>()

defineSlots<
  Record<`cell-${string}`, (props: { row: TData }) => unknown> &
    Record<`header-${string}`, () => unknown>
>()
</script>

<template>
  <table class="tbl">
    <thead>
      <tr v-for="group in table.getHeaderGroups()" :key="group.id">
        <th v-for="header in group.headers" :key="header.id" scope="col">
          <button
            v-if="header.column.getCanSort()"
            type="button"
            class="row-flex"
            style="gap: 4px"
            @click="header.column.toggleSorting()"
          >
            <slot :name="`header-${header.column.id}`"><FlexRender :header="header" /></slot>
            <UIcon
              v-if="header.column.getIsSorted()"
              :name="
                header.column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
              "
              class="ic-13"
            />
          </button>
          <slot v-else-if="!header.isPlaceholder" :name="`header-${header.column.id}`">
            <FlexRender :header="header" />
          </slot>
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-if="loading">
        <tr v-for="line in [56, 44, 62]" :key="line">
          <td v-for="column in table.getAllLeafColumns()" :key="column.id">
            <div class="sk" :style="{ height: '12px', width: `${line}%` }" />
          </td>
        </tr>
      </template>
      <tr v-else-if="table.getRowModel().rows.length === 0">
        <td :colspan="table.getAllLeafColumns().length">
          <div class="empty"><p>{{ empty }}</p></div>
        </td>
      </tr>
      <tr
        v-for="row in table.getRowModel().rows"
        v-else
        :key="row.id"
        :class="{ on: row.id === selectedId }"
        @click="emit('select', row.id)"
      >
        <td
          v-for="cell in row.getAllCells()"
          :key="cell.id"
          :class="{ r: cell.column.id === 'actions' }"
        >
          <slot :name="`cell-${cell.column.id}`" :row="row.original">
            <FlexRender :cell="cell" />
          </slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
