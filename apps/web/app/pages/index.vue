<script setup lang="ts">
const { projects } = useCurrentProject()
</script>

<template>
  <AppPage title="Home">
    <ul class="-mx-4 border-t border-default sm:-mx-6">
      <li v-for="project in projects" :key="project.id" class="border-b border-default">
        <ULink
          :to="`/projects/${project.id}/texts`"
          class="flex items-center gap-4 px-4 py-3 hover:bg-muted sm:px-6"
        >
          <span class="min-w-0 flex-1">
            <span class="block font-medium text-highlighted">{{ project.name }}</span>
            <span class="block truncate text-xs text-muted">{{
              project.apps.map(({ name }) => name).join(' · ')
            }}</span>
          </span>
          <span class="font-mono text-xs text-muted">{{ project.languages.join(' ') }}</span>
        </ULink>
      </li>
    </ul>
  </AppPage>
</template>
