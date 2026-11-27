<script setup lang="ts">
import { ref } from 'vue'

const { value } = defineProps<{ value: string }>()
const copied = ref<boolean>(false)

async function copy() {
  await navigator.clipboard.writeText(value).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <button
    type="button"
    class="key"
    :title="copied ? 'Copied' : 'Copy the key'"
    data-glot="key"
    :style="{ whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'left', cursor: 'copy' }"
    @click.stop="copy"
    @keydown.enter.stop
  >
    {{ copied ? 'Copied' : value }}
  </button>
</template>
