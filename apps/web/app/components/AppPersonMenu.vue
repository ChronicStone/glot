<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { APPEARANCES, APPEARANCE_LABELS } from '../constants/shell.constants.ts'

const { $auth } = useNuxtApp()
const session = $auth.useSession()
const colorMode = useColorMode()

async function signOut() {
  await $auth.signOut()
  await navigateTo('/sign-in')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [
    { type: 'label', label: 'Appearance' },
    ...Object.values(APPEARANCES).map((appearance) => ({
      label: APPEARANCE_LABELS[appearance],
      type: 'checkbox' as const,
      checked: colorMode.preference === appearance,
      onSelect: () => {
        colorMode.preference = appearance
      },
    })),
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }],
])
</script>

<template>
  <UDropdownMenu
    v-if="session.data"
    :items="items"
    :content="{ side: 'top', align: 'start' }"
    :ui="{ content: 'w-60' }"
  >
    <UButton color="neutral" variant="ghost" block class="justify-start px-1.5">
      <UUser
        :name="session.data.user.name"
        :description="session.data.user.email"
        :avatar="{ alt: session.data.user.name }"
        size="sm"
        :ui="{ wrapper: 'min-w-0 text-left', description: 'truncate' }"
      />
    </UButton>
  </UDropdownMenu>
</template>
