<script setup lang="ts">
defineProps<{ active: boolean }>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    @click="emit('click', $event)"
    class="h-7 shrink-0 rounded-full bg-sunken px-3 text-[12.5px] font-medium whitespace-nowrap text-ink-2 transition-colors hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent aria-pressed:ring-1 aria-pressed:ring-accent-line aria-pressed:ring-inset"
  >
    <slot />
  </button>
</template>
