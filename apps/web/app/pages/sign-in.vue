<script setup lang="ts">
import { signInSchema } from '@glot/auth/validators/sign-in'
import { useForm } from '@tanstack/vue-form'

definePageMeta({ layout: 'auth' })

const sent = ref<boolean>(false)
const { $auth } = useNuxtApp()

const form = useForm({
  defaultValues: { email: '' },
  validators: { onSubmit: signInSchema },
  onSubmit: async ({ value }) => {
    await $auth.signIn.magicLink({ email: value.email, callbackURL: '/' })
    sent.value = true
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)
</script>

<template>
  <h1 class="mb-4 text-[19px] font-semibold tracking-tight text-highlighted">Sign in to Glot</h1>
  <p v-if="sent" class="text-toned">Check your inbox for a sign-in link.</p>
  <form v-else class="flex flex-col gap-4" @submit.prevent.stop="form.handleSubmit()">
    <form.Field v-slot="{ field }" name="email">
      <UFormField label="Email" :error="field.state.meta.errors[0]?.message ?? false">
        <UInput
          :model-value="field.state.value"
          type="email"
          placeholder="you@company.com"
          size="lg"
          class="w-full"
          autofocus
          @update:model-value="field.handleChange"
          @blur="field.handleBlur"
        />
      </UFormField>
    </form.Field>
    <UButton
      type="submit"
      color="neutral"
      size="lg"
      block
      label="Send me a link"
      :loading="submitting"
    />
  </form>
</template>
