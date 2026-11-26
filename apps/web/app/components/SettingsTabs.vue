<script setup lang="ts">
import { SETTINGS_LINKS } from '../constants/people.constants.ts'
</script>

<template>
  <UNavigationMenu
    :items="Object.values(SETTINGS_LINKS)"
    highlight
    class="-mb-px px-2 sm:px-4"
    :ui="{ root: 'border-b border-default' }"
  />
</template>
