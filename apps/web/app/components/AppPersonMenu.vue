<script setup lang="ts">
import GlotAvatar from '@glot/ui/components/GlotAvatar.vue'
import { CheckIcon, LogOutIcon } from '@lucide/vue'
import {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@ui-sdk/vue/menu'
import { APPEARANCES, APPEARANCE_LABELS } from '../constants/shell.constants.ts'

const { $auth } = useNuxtApp()
const session = $auth.useSession()
const { appearance, choose } = useAppearance()
const choices = Object.values(APPEARANCES)

async function signOut() {
  await $auth.signOut()
  await navigateTo('/sign-in')
}

function chooseAppearance(value: string) {
  const next = choices.find((choice) => choice === value)

  if (next) {
    choose(next)
  }
}
</script>

<template>
  <Menu v-if="session.data">
    <MenuTrigger
      class="flex w-full items-center gap-2.5 rounded-control border-0 bg-transparent px-2 py-2 text-left outline-none hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-accent-line"
    >
      <GlotAvatar :name="session.data.user.name" />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{{ session.data.user.name }}</span>
        <span class="block truncate text-xs text-ink-3">{{ session.data.user.email }}</span>
      </span>
    </MenuTrigger>
    <MenuContent
      side="top"
      align="start"
      class="z-50 w-60 rounded-card bg-surface p-1 shadow-pop outline-none"
    >
      <MenuRadioGroup :value="appearance" @value-change="chooseAppearance">
        <MenuGroupLabel class="px-3 pt-2 pb-1 text-xs text-ink-3">Appearance</MenuGroupLabel>
        <MenuRadioItem
          v-for="choice in choices"
          :key="choice"
          :value="choice"
          class="flex h-9 cursor-default items-center gap-2 rounded-control px-3 outline-none data-highlighted:bg-sunken"
        >
          <span class="flex-1">{{ APPEARANCE_LABELS[choice] }}</span>
          <MenuItemIndicator><CheckIcon class="size-4 text-accent" /></MenuItemIndicator>
        </MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator class="my-1 h-px bg-line" />
      <MenuItem
        value="sign-out"
        class="flex h-9 cursor-default items-center gap-2 rounded-control px-3 outline-none data-highlighted:bg-sunken"
        @select="signOut"
      >
        <LogOutIcon class="size-4 text-ink-3" aria-hidden="true" />
        Sign out
      </MenuItem>
    </MenuContent>
  </Menu>
</template>
