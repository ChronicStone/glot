<script setup lang="ts">
import { computed, ref } from 'vue'

const { value } = defineProps<{ value: string }>()
const copied = ref<boolean>(false)
const segments = computed(() => value.split('.'))

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
    :aria-label="`Copy the key ${value}`"
    data-glot="key"
    :data-key="value"
    :style="{ whiteSpace: 'normal', overflowWrap: 'normal', textAlign: 'left', cursor: 'copy' }"
    @click.stop="copy"
    @keydown.enter.stop
  >
    <template v-if="copied">Copied</template>
    <template v-for="(segment, index) in segments" v-else :key="index"
      ><template v-if="index > 0">.<wbr /></template>{{ segment }}</template
    >
  </button>
</template>
