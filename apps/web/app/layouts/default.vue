<script setup lang="ts">
const paletteOpen = ref<boolean>(false)
const menuOpen = ref<boolean>(false)
const route = useRoute()

defineShortcuts({
  meta_k: () => {
    paletteOpen.value = !paletteOpen.value
  },
})

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

provide('openMenu', () => {
  menuOpen.value = true
})

provide('openPalette', () => {
  paletteOpen.value = true
})
</script>

<template>
  <div class="app">
    <AppSidebar @search="paletteOpen = true" />
    <main class="main">
      <slot />
    </main>
    <USlideover
      v-model:open="menuOpen"
      side="left"
      title="Menu"
      :ui="{ content: 'side-drawer w-[272px] max-w-[85vw] bg-page' }"
    >
      <template #content>
        <AppSidebar @search="paletteOpen = true" />
      </template>
    </USlideover>
    <AppCommandPalette v-model:open="paletteOpen" />
  </div>
</template>
