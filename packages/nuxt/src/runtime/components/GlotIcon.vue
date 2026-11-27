<script setup lang="ts">
import icons from '#build/glot/widget-icons.mjs'
import type { ValueOf } from '@glot/utils/types'
import type { WIDGET_ICONS } from '../../constants/module.constants.ts'

const { name } = defineProps<{ name: ValueOf<typeof WIDGET_ICONS> }>()
</script>

<template>
  <svg
    class="iconify"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="icons[name] ?? ''"
  />
</template>
