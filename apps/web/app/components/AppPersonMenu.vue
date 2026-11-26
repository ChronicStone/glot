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

  if (!role) {
    return ''
  }

  return `${ROLE_LABELS[role]} · ${languages ? languages.join(', ') : 'all languages'}`
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
    :content="{ side: 'top', align: 'start' }"
    :ui="{ content: 'w-[236px]' }"
  >
    <button
      type="button"
      class="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-hover-page"
    >
      <UAvatar
        :alt="session.data.user.name"
        size="md"
        :ui="{ root: 'bg-d-blue', fallback: 'font-semibold text-white' }"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[13px] leading-4 font-medium text-ink">{{
          session.data.user.name
        }}</span>
        <span class="block truncate text-xs leading-[15px] text-ink-3">{{ scope }}</span>
      </span>
      <UIcon name="i-lucide-ellipsis" class="size-[15px] shrink-0 text-ink-4" />
    </button>
  </UDropdownMenu>
</template>
