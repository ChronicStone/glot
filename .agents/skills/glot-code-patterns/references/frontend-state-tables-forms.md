# Screens: server state, tables and forms

Screens are built from Nuxt UI components themed by the `--glot-*` tokens, VueUse composables, and three TanStack libraries at their latest versions: Query 5 for server state, Table 9 for tables, Form 1 for forms. Each has one way of being used here.

## Server state: TanStack Query

- Read through the oRPC utils on `$api`: `useQuery(() => $api.texts.search.queryOptions({ input: { … } }))`. Pass a getter, and read every ref inside it, so the query key follows the inputs. Add `enabled` there when an input may be missing.
- Write through `useMutation($api.people.invite.mutationOptions({ onSuccess }))`, and invalidate with `$api.<domain>.key()` from `$queryClient` (`useNuxtApp()`).
- Server state that does not come from oRPC (better-auth: API keys, workspaces) has one composable owning its `queryOptions` and mutations, such as `useApiKeys()`. No other file names its query key.
- Never copy query data into a local ref. Derive with `computed`, and give an empty array a stable fallback (`computed(() => query.data.value ?? [])`).

## Tables: TanStack Table 9

- Build tables with `useAppTable` and `createAppColumnHelper` from `app/config/table.config.ts`, the one `createTableHook` with the features Glot uses. Register a feature there before using its API.
- Define columns with the helper (`helper.columns([helper.accessor(…), helper.display(…)])`) so cell values keep their types. Pass `data` as a ref or computed, never `.value`, and give rows a `getRowId`.
- Render through `AppDataTable`: its `cell-<column id>` slots receive the typed row. Sorting, empty and loading states live there, not in pages.
- Server-side paging, sorting or filtering sets the matching `manual*` option, and every input it depends on goes into the query.

## Forms: TanStack Form 1

- Build forms with `useForm({ defaultValues, validators: { onSubmit: schema }, onSubmit })`. The schema is the contract's or the auth package's validator (Standard Schema): never write a form schema that restates an input the contract owns. Type `defaultValues` with the contract's input type when the schema validates the whole form.
- `onSubmit` calls `mutateAsync` of a mutation built from `mutationOptions`, so pending, error and cache invalidation stay in Query.
- Render fields with `<form.Field v-slot="{ field }" name="…">` around Nuxt UI inputs: `:model-value="field.state.value"`, `@update:model-value="field.handleChange"`, `@blur="field.handleBlur"`, and the first message of `field.state.meta.errors` on `UFormField`.
- Read form state with `form.useSelector(…)` (`isSubmitting`, `canSubmit`), not `form.useStore`, which is deprecated.
