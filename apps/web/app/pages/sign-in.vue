<script setup lang="ts">
import GlotButton from '@glot/ui/components/GlotButton.vue'

definePageMeta({ layout: false })

const email = ref<string>('')
const sent = ref<boolean>(false)
const { $auth } = useNuxtApp()

async function sendLink() {
  await $auth.signIn.magicLink({ email: email.value, callbackURL: '/' })
  sent.value = true
}
</script>

<template>
  <div class="grid h-dvh place-items-center">
    <form
      class="flex w-[360px] flex-col gap-4 rounded-card bg-surface p-6 shadow-card"
      @submit.prevent="sendLink"
    >
      <h1 class="text-[19px] font-semibold tracking-tight">Sign in to Glot</h1>
      <p v-if="sent" class="text-ink-2">Check your inbox for a sign-in link.</p>
      <template v-else>
        <input
          v-model="email"
          type="email"
          required
          placeholder="you@company.com"
          class="h-10 rounded-control bg-sunken px-3 outline-none focus:ring-2 focus:ring-accent-line"
        />
        <GlotButton tone="primary" type="submit">Send me a link</GlotButton>
      </template>
    </form>
  </div>
</template>
