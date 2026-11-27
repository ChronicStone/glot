<script setup lang="ts">
const { source, path, copyable } = defineProps<{
  source: string
  path: string
  copyable?: boolean
}>()

const { copy, copied } = useClipboard()
</script>

<template>
  <span class="text-key"
    ><span class="key">{{ source }} · {{ path }}</span
    ><button
      v-if="copyable"
      type="button"
      class="btn btn-ghost btn-xs btn-icon"
      :title="copied ? 'Copied' : 'Copy the key'"
      :aria-label="copied ? 'Copied' : 'Copy the key'"
      @click.stop="copy(path)"
    >
      <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" /></button
  ></span>
</template>
