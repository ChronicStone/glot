<script setup lang="ts">
import { MenuIcon, XIcon } from '@lucide/vue'
import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerTitle } from '@ui-sdk/vue/drawer'

const menuOpen = ref<boolean>(false)
const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <div class="grid h-dvh grid-rows-[auto_1fr] md:grid-cols-[232px_1fr] md:grid-rows-1">
    <aside class="hidden min-h-0 md:block">
      <AppRail />
    </aside>
    <header class="flex items-center gap-2 px-3 pt-2 md:hidden">
      <Drawer v-model:open="menuOpen" side="left">
        <button
          type="button"
          aria-label="Menu"
          class="grid size-10 place-items-center rounded-control text-ink-2 hover:bg-surface"
          @click="menuOpen = true"
        >
          <MenuIcon class="size-5" />
        </button>
        <DrawerBackdrop class="fixed inset-0 z-40 bg-ink/20" />
        <DrawerContent class="fixed inset-y-0 left-0 z-50 w-[280px] bg-bg shadow-pop outline-none">
          <DrawerTitle class="sr-only">Menu</DrawerTitle>
          <DrawerClose
            aria-label="Close"
            class="absolute top-4 right-3 grid size-8 place-items-center rounded-control text-ink-3 hover:bg-surface"
          >
            <XIcon class="size-4" />
          </DrawerClose>
          <AppRail />
        </DrawerContent>
      </Drawer>
      <span
        class="grid size-7 place-items-center rounded-lg bg-ink text-[13px] font-semibold text-bg"
        aria-hidden="true"
        >g</span
      >
    </header>
    <main class="min-h-0 min-w-0 p-2 md:py-3 md:pr-3 md:pl-0">
      <div class="flex h-full flex-col overflow-hidden rounded-panel bg-surface shadow-card">
        <slot />
      </div>
    </main>
  </div>
</template>
