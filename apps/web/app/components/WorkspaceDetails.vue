<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { useMutation, useQuery } from '@tanstack/vue-query'
import * as z from 'zod'

const { workspaceId, name, editable } = defineProps<{
  workspaceId: string
  name: string
  editable: boolean
}>()

const { $api } = useNuxtApp()
const toast = useToast()
const origin = useRequestURL().origin
const health = useQuery($api.health.queryOptions())
const { workspaces } = useCurrentWorkspace()

const rename = useMutation(
  $api.people.updateWorkspace.mutationOptions({
    onSuccess: async () => {
      await workspaces.value.refetch()
      toast.add({ title: 'Workspace renamed', color: 'success', icon: 'i-lucide-check' })
    },
    onError: (error) => {
      toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
    },
  }),
)

const form = useForm({
  defaultValues: { name },
  validators: { onSubmit: z.object({ name: z.string().trim().min(1).max(80) }) },
  onSubmit: async ({ value }) => {
    await rename.mutateAsync({ workspaceId, name: value.name })
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)
</script>

<template>
  <section class="panel panel-pad">
    <form novalidate class="stack" style="gap: 16px" @submit.prevent.stop="form.handleSubmit()">
      <span class="h3">Workspace</span>
      <form.Field v-slot="{ field }" name="name">
        <div class="field">
          <span class="label">Name</span>
          <div class="row-flex" style="gap: 8px">
            <label
              :class="{ 'is-error': field.state.meta.errors.length > 0, 'is-disabled': !editable }"
              class="input grow"
              ><input
                :value="field.state.value"
                :disabled="!editable"
                aria-label="Workspace name"
                @input="field.handleChange(inputValue($event))"
            /></label>
            <button
              v-if="editable"
              type="submit"
              class="btn btn-outline"
              :class="{ 'is-loading': submitting }"
            >
              Rename
            </button>
          </div>
          <span v-if="field.state.meta.errors.length > 0" class="hint err">{{
            errorMessage(field.state.meta.errors)
          }}</span>
        </div>
      </form.Field>
      <div class="field">
        <span class="label">Address</span>
        <div class="input is-disabled"><UIcon name="i-lucide-globe" />{{ origin }}</div>
        <span class="hint"
          >Self-hosted<template v-if="health.data.value">
            · version {{ health.data.value.version }}</template
          ></span
        >
      </div>
    </form>
  </section>
</template>
