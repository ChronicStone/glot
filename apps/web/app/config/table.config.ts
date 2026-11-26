import {
  createSortedRowModel,
  createTableHook,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from '@tanstack/vue-table'
import type { RowData, VueTable } from '@tanstack/vue-table'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime, text: sortFn_text },
})

const hook = createTableHook({ features })

export const useAppTable = hook.useAppTable

export const createAppColumnHelper = hook.createAppColumnHelper

export const useTableContext: <TData extends RowData = RowData>() => VueTable<
  typeof features,
  TData
> = hook.useTableContext
