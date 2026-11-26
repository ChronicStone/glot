<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { $auth } = useNuxtApp()
const token = computed<string>(() => String(route.query.token ?? ''))
const open = ref<boolean | undefined>(undefined)
const message = ref<string>('')

const schema = z.object({
  workspaceName: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
})

const state = reactive({ workspaceName: '', name: '', email: '' })

onMounted(async () => {
  const { data } = await $auth.setup.status()
  open.value = Boolean(data?.open) && token.value !== ''
})

async function createAdministrator() {
  message.value = ''

  const { error } = await $auth.setup.complete({ token: token.value, ...state })

  if (error) {
    message.value = error.message ?? ''

    return
  }

  await navigateTo('/', { external: true })
}
</script>

<template>
  <template v-if="open">
    <h1 class="mb-4 text-[19px] font-semibold tracking-tight text-highlighted">Set up Glot</h1>
    <UForm
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="createAdministrator"
    >
      <UFormField name="workspaceName" label="Workspace name">
        <UInput
          v-model="state.workspaceName"
          autocomplete="organization"
          size="lg"
          class="w-full"
        />
      </UFormField>
      <UFormField name="name" label="Your name">
        <UInput v-model="state.name" autocomplete="name" size="lg" class="w-full" />
      </UFormField>
      <UFormField name="email" label="Email">
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="you@company.com"
          size="lg"
          class="w-full"
        />
      </UFormField>
      <UAlert v-if="message" color="error" variant="soft" :title="message" />
      <UButton type="submit" color="neutral" size="lg" block label="Create administrator" />
    </UForm>
  </template>
  <template v-else-if="open === false">
    <h1 class="mb-2 text-[19px] font-semibold tracking-tight text-highlighted">
      This setup link is not valid anymore
    </h1>
    <ULink to="/sign-in" class="text-toned">Go to sign in</ULink>
  </template>
</template>
