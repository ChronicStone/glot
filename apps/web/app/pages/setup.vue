<script setup lang="ts">
import GlotButton from '@glot/ui/components/GlotButton.vue'

definePageMeta({ layout: false })

const route = useRoute()
const { $auth } = useNuxtApp()
const token = computed<string>(() => String(route.query.token ?? ''))
const open = ref<boolean | undefined>(undefined)
const name = ref<string>('')
const email = ref<string>('')
const workspaceName = ref<string>('')
const message = ref<string>('')
const pending = ref<boolean>(false)

onMounted(async () => {
  const { data } = await $auth.setup.status()
  open.value = Boolean(data?.open) && token.value !== ''
})

async function createAdministrator() {
  pending.value = true
  message.value = ''

  const { error } = await $auth.setup.complete({
    token: token.value,
    name: name.value,
    email: email.value,
    workspaceName: workspaceName.value,
  })

  pending.value = false

  if (error) {
    message.value = error.message ?? ''

    return
  }

  await navigateTo('/', { external: true })
}
</script>

<template>
  <div class="grid h-dvh place-items-center">
    <form
      v-if="open"
      class="flex w-[360px] flex-col gap-4 rounded-card bg-surface p-6 shadow-card"
      @submit.prevent="createAdministrator"
    >
      <h1 class="text-[19px] font-semibold tracking-tight">Set up Glot</h1>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-ink-2">Workspace name</span>
        <input
          v-model="workspaceName"
          required
          autocomplete="organization"
          class="h-10 rounded-control bg-sunken px-3 outline-none focus:ring-2 focus:ring-accent-line"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-ink-2">Your name</span>
        <input
          v-model="name"
          required
          autocomplete="name"
          class="h-10 rounded-control bg-sunken px-3 outline-none focus:ring-2 focus:ring-accent-line"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-ink-2">Email</span>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="you@company.com"
          class="h-10 rounded-control bg-sunken px-3 outline-none focus:ring-2 focus:ring-accent-line"
        />
      </label>
      <p v-if="message" role="alert" class="text-ink-2">{{ message }}</p>
      <GlotButton tone="primary" type="submit">Create administrator</GlotButton>
    </form>
    <div
      v-else-if="open === false"
      class="flex w-[360px] flex-col gap-4 rounded-card bg-surface p-6 shadow-card"
    >
      <h1 class="text-[19px] font-semibold tracking-tight">This setup link is not valid anymore</h1>
      <NuxtLink to="/sign-in" class="text-ink-2">Go to sign in</NuxtLink>
    </div>
  </div>
</template>
