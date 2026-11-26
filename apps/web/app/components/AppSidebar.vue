<script setup lang="ts">
const emit = defineEmits<{ search: [] }>()
const route = useRoute()

const links = [
  { label: 'Home', icon: 'i-lucide-house', to: '/' },
  { label: 'Glossary', icon: 'i-lucide-book-open-text', to: '/glossary' },
]
</script>

<template>
  <aside class="side">
    <AppWorkspaceMenu />
    <button type="button" class="side-search" @click="emit('search')">
      <UIcon name="i-lucide-search" class="ic-14" />Search or jump to…<span class="kbd">⌘K</span>
    </button>
    <nav class="nav">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :class="{ on: route.path === link.to }"
        ><UIcon :name="link.icon" /><span class="lbl">{{ link.label }}</span></NuxtLink
      >
    </nav>
    <AppProjectGroups />
    <div class="side-foot">
      <nav class="nav">
        <NuxtLink to="/settings" :class="{ on: route.path.startsWith('/settings') }"
          ><UIcon name="i-lucide-settings-2" /><span class="lbl">Settings</span></NuxtLink
        >
      </nav>
      <AppPersonMenu />
    </div>
  </aside>
</template>
