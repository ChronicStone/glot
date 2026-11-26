<script setup lang="ts">
const { projects } = useCurrentProject()
</script>

<template>
  <AppPageHeader title="Home" />
  <ul class="border-t border-line">
    <li v-for="project in projects.data.value" :key="project.id" class="border-b border-line">
      <NuxtLink
        :to="`/projects/${project.id}/texts`"
        class="flex items-center gap-4 px-4 py-3 no-underline hover:bg-sunken md:px-6"
      >
        <span class="min-w-0 flex-1">
          <span class="block font-medium">{{ project.name }}</span>
          <span class="block truncate text-xs text-ink-3">{{
            project.apps.map(({ name }) => name).join(' · ')
          }}</span>
        </span>
        <span class="font-mono text-xs text-ink-3">{{ project.languages.join(' ') }}</span>
      </NuxtLink>
    </li>
  </ul>
</template>
