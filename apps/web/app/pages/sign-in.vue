<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })

const schema = z.object({ email: z.email() })
const state = reactive({ email: '' })
const sent = ref<boolean>(false)
const { $auth } = useNuxtApp()

async function sendLink() {
  await $auth.signIn.magicLink({ email: state.email, callbackURL: '/' })
  sent.value = true
}
</script>

<template>
  <h1 class="mb-4 text-[19px] font-semibold tracking-tight text-highlighted">Sign in to Glot</h1>
  <p v-if="sent" class="text-toned">Check your inbox for a sign-in link.</p>
  <UForm v-else :schema="schema" :state="state" class="flex flex-col gap-4" @submit="sendLink">
    <UFormField name="email" label="Email">
      <UInput
        v-model="state.email"
        type="email"
        placeholder="you@company.com"
        size="lg"
        class="w-full"
        autofocus
      />
    </UFormField>
    <UButton type="submit" color="neutral" size="lg" block label="Send me a link" />
  </UForm>
</template>
