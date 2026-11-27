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
  <AppDialog
    v-model:open="open"
    :title="created ? 'Copy this key now' : 'Create a key'"
    :description="
      created
        ? 'You won’t see it again. Store it in your CI secrets.'
        : 'For an agent, a script or CI.'
    "
    :icon="created ? 'i-lucide-check' : 'i-lucide-key-round'"
    :tone="created ? 'ok' : ''"
  >
    <div v-if="created" class="keywell">
      <span>{{ created }}</span
      ><button type="button" class="btn btn-primary btn-sm" @click="copy(created)">
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" />{{
          copied ? 'Copied' : 'Copy'
        }}
      </button>
    </div>
    <form novalidate v-else id="key-form" @submit.prevent.stop="form.handleSubmit()">
      <form.Field v-slot="{ field }" name="name">
        <div class="field">
          <span class="label">Name</span>
          <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
            ><input
              :value="field.state.value"
              placeholder="CI agent"
              autofocus
              aria-label="Name"
              @input="field.handleChange(inputValue($event))"
          /></label>
          <span v-if="errorMessage(field.state.meta.errors)" class="hint err">{{
            errorMessage(field.state.meta.errors)
          }}</span>
        </div>
      </form.Field>
    </form>
    <template #footer>
      <span class="muted" style="font-size: 13px">{{
        created ? 'Lost it? Revoke it and create another.' : ''
      }}</span>
      <span class="g-grow" />
      <button v-if="created" type="button" class="btn btn-primary" @click="open = false">
        Done
      </button>
      <template v-else>
        <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
        <button
          type="submit"
          form="key-form"
          class="btn btn-primary"
          :class="{ 'is-loading': submitting }"
        >
          Create key
        </button>
      </template>
    </template>
  </AppDialog>
</template>
