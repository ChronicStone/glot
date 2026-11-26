<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { QUERY_KEYS } from '../constants/queries.constants.ts'

const open = defineModel<boolean>('open', { required: true })

const { $auth, $queryClient } = useNuxtApp()
const toast = useToast()
const name = ref<string>('')
const created = ref<string>('')
const { copy, copied } = useClipboard()

const create = useMutation({
  mutationFn: async () => {
    const { data, error } = await $auth.apiKey.create({ name: name.value })

    if (error) {
      throw new Error(error.message)
    }

    return data
  },
  onSuccess: async (key) => {
    created.value = key.key
    await $queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] })
  },
  onError: (error) => toast.add({ title: error.message, color: 'error' }),
})

watch(open, (isOpen) => {
  if (!isOpen) {
    name.value = ''
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
      <UForm v-else id="key-form" :state="{ name }" @submit="create.mutate()">
        <UFormField name="name" label="Name" required>
          <UInput v-model="name" placeholder="Release agent" class="w-full" autofocus required />
        </UFormField>
      </UForm>
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
          :loading="create.isPending.value"
        />
      </template>
    </template>
  </UModal>
</template>
