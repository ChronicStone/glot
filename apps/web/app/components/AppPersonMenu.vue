<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { ROLE_LABELS } from '../constants/people.constants.ts'
import { APPEARANCES, APPEARANCE_ICONS, APPEARANCE_LABELS } from '../constants/shell.constants.ts'

const { $auth } = useNuxtApp()
const session = $auth.useSession()
const colorMode = useColorMode()
const { access } = useAccess()

const scope = computed(() => {
  const role = access.data.value?.role
  const languages = access.data.value?.languages

  return role ? `${ROLE_LABELS[role]} · ${languages ? languages.join(', ') : 'all languages'}` : ''
})

async function signOut() {
  await $auth.signOut()
  await navigateTo('/sign-in')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: session.value.data?.user.email ?? '' }],
  [
    { type: 'label', label: 'Appearance' },
    ...Object.values(APPEARANCES).map((appearance) => ({
      label: APPEARANCE_LABELS[appearance],
      icon: APPEARANCE_ICONS[appearance],
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
    :content="{ side: 'top', align: 'start', sideOffset: 4 }"
    :ui="{ content: 'pop menu w-[236px]' }"
  >
    <button type="button" class="me">
      <AppAvatar :name="session.data.user.name" size="md" />
      <span>
        <div class="t">{{ session.data.user.name }}</div>
        <div class="s">{{ scope }}</div>
      </span>
      <UIcon name="i-lucide-ellipsis" />
    </button>
  </UDropdownMenu>
</template>
