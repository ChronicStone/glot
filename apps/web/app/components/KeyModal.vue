<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import * as z from 'zod'

const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const { create } = useApiKeys()
const created = ref<string>('')
const { copy, copied } = useClipboard()

const form = useForm({
  defaultValues: { name: '' },
  validators: { onSubmit: z.object({ name: z.string().trim().min(1) }) },
  onSubmit: async ({ value }) => {
    try {
      created.value = (await create.mutateAsync(value.name)).key
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : String(error), color: 'error' })
    }
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)

watch(open, (isOpen) => {
  if (!isOpen) {
    form.reset()
    created.value = ''
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="created ? 'Copy the key now' : 'New API key'"
    :description="created ? 'It is shown only once.' : 'For an agent, a script or CI.'"
  >
    <template #body>
      <div v-if="created" class="flex gap-2">
        <UInput :model-value="created" readonly class="flex-1 font-mono" />
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          :label="copied ? 'Copied' : 'Copy'"
          color="neutral"
          variant="outline"
          @click="copy(created)"
        />
      </div>
      <form v-else id="key-form" @submit.prevent.stop="form.handleSubmit()">
        <form.Field v-slot="{ field }" name="name">
          <UFormField label="Name" :error="field.state.meta.errors[0]?.message ?? false">
            <UInput
              :model-value="field.state.value"
              placeholder="Release agent"
              class="w-full"
              autofocus
              @update:model-value="field.handleChange"
            />
          </UFormField>
        </form.Field>
      </form>
    </template>
    <template #footer>
      <span class="flex-1" />
      <UButton v-if="created" label="Done" color="neutral" @click="open = false" />
      <template v-else>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          type="submit"
          form="key-form"
          label="Create key"
          color="neutral"
          :loading="submitting"
        />
      </template>
    </template>
  </UModal>
</template>
