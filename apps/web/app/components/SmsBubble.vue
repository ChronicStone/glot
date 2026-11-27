<script setup lang="ts">
import { smsLength } from '@glot/checks'

const { text, from } = defineProps<{ text: string; from: string | null }>()

const length = computed(() => smsLength(text))

const parts = computed(() =>
  Array.from(text).map((character) => ({
    character,
    unicode: length.value.unicodeCharacters.includes(character),
  })),
)
</script>

<template>
  <div class="sms-phone">
    <div class="sms-h"><UIcon name="i-lucide-chevron-left" class="ic-14" /><b>{{ from }}</b></div>
    <div class="sms-b">
      <div class="bubble">
        <template v-for="(part, index) in parts" :key="index"
          ><span v-if="part.unicode" class="hl">{{ part.character }}</span
          ><template v-else>{{ part.character }}</template></template
        >
      </div>
      <div class="sms-meta">{{ length.messages }} SMS · sent as {{ length.alphabet }}</div>
    </div>
  </div>
</template>
