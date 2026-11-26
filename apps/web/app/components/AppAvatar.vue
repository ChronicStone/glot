<script setup lang="ts">
defineProps<{ name: string; size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <span
    :class="size ? `av-${size}` : ''"
    class="av"
    :style="{ background: avatarColor(name) }"
    :title="name"
    >{{ initialsOf(name) }}</span
  >
</template>
