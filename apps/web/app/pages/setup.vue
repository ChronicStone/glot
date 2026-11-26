<script setup lang="ts">
import { setupCompleteSchema } from '@glot/auth/validators/setup'
import { useForm } from '@tanstack/vue-form'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { $auth } = useNuxtApp()
const token = computed<string>(() => String(route.query.token ?? ''))
const open = ref<boolean | undefined>(undefined)
const message = ref<string>('')

const fields = [
  { name: 'workspaceName', label: 'Workspace name', type: 'text', autocomplete: 'organization' },
  { name: 'name', label: 'Your name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
] as const

const form = useForm({
  defaultValues: { workspaceName: '', name: '', email: '' },
  validators: { onSubmit: setupCompleteSchema.omit({ token: true }) },
  onSubmit: async ({ value }) => {
    message.value = ''

    const { error } = await $auth.setup.complete({ token: token.value, ...value })

    if (error) {
      message.value = error.message ?? ''

      return
    }

    await navigateTo('/', { external: true })
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)

onMounted(async () => {
  const { data } = await $auth.setup.status()
  open.value = Boolean(data?.open) && token.value !== ''
})
</script>

<template>
  <template v-if="open">
    <h1 class="mb-4 text-[19px] font-semibold tracking-tight text-highlighted">Set up Glot</h1>
    <form class="flex flex-col gap-4" @submit.prevent.stop="form.handleSubmit()">
      <form.Field v-for="input in fields" :key="input.name" v-slot="{ field }" :name="input.name">
        <UFormField :label="input.label" :error="field.state.meta.errors[0]?.message ?? false">
          <UInput
            :model-value="field.state.value"
            :type="input.type"
            :autocomplete="input.autocomplete"
            size="lg"
            class="w-full"
            @update:model-value="field.handleChange"
            @blur="field.handleBlur"
          />
        </UFormField>
      </form.Field>
      <UAlert v-if="message" color="error" variant="soft" :title="message" />
      <UButton
        type="submit"
        color="neutral"
        size="lg"
        block
        label="Create administrator"
        :loading="submitting"
      />
    </form>
  </template>
  <template v-else-if="open === false">
    <h1 class="mb-2 text-[19px] font-semibold tracking-tight text-highlighted">
      This setup link is not valid anymore
    </h1>
    <ULink to="/sign-in" class="text-toned">Go to sign in</ULink>
  </template>
</template>
