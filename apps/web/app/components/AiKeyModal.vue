<script setup lang="ts">
import type { AiSettingsView } from '@glot/contract'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import * as z from 'zod'
import { AI_PROVIDER_LABELS } from '../constants/ai.constants.ts'

const { workspaceId, provider } = defineProps<{
  workspaceId: string
  provider: AiSettingsView['provider']
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()

const setKey = useMutation(
  $api.ai.setKey.mutationOptions({
    onSuccess: async () => {
      await $queryClient.invalidateQueries({ queryKey: $api.ai.key() })
      toast.add({
        title: `${AI_PROVIDER_LABELS[provider]} key saved`,
        color: 'success',
        icon: 'i-lucide-check',
      })
      open.value = false
    },
    onError: (error) => {
      toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
    },
  }),
)

const form = useForm({
  defaultValues: { key: '' },
  validators: { onSubmit: z.object({ key: z.string().trim().min(8, 'Paste the whole key.') }) },
  onSubmit: async ({ value }) => {
    await setKey.mutateAsync({ workspaceId, provider, key: value.key })
  },
})

watch(open, (isOpen) => {
  if (!isOpen) {
    form.reset()
  }
})
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="`${AI_PROVIDER_LABELS[provider]} key`"
    description="Stored encrypted. Glot never shows it again, only its last 4 characters."
    icon="i-lucide-key-round"
  >
    <form id="ai-key-form" @submit.prevent.stop="form.handleSubmit()">
      <form.Field v-slot="{ field }" name="key">
        <div class="field">
          <span class="label">API key</span>
          <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
            ><input
              :value="field.state.value"
              type="password"
              autocomplete="off"
              autofocus
              aria-label="API key"
              @input="field.handleChange(inputValue($event))"
          /></label>
          <span v-if="field.state.meta.errors.length > 0" class="hint err">{{
            errorMessage(field.state.meta.errors)
          }}</span>
        </div>
      </form.Field>
    </form>
    <template #footer>
      <span class="g-grow" />
      <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
      <button
        type="submit"
        form="ai-key-form"
        class="btn btn-primary"
        :class="{ 'is-loading': setKey.isPending.value }"
      >
        Save key
      </button>
    </template>
  </AppDialog>
</template>
