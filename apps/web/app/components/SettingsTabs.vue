<script setup lang="ts">
import { SETTINGS_LINKS } from '../constants/people.constants.ts'

const route = useRoute()
</script>

<template>
  <div class="set-tabs">
    <NuxtLink
      v-for="link in Object.values(SETTINGS_LINKS)"
      :key="link.to"
      :to="link.to"
      :class="{ on: route.path === link.to }"
      ><UIcon :name="link.icon" />{{ link.label }}</NuxtLink
    >
  </div>
</template>
