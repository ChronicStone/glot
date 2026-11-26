<script setup lang="ts">
import type { Translation } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { TEXT_STATE_CLASSES, TEXT_STATE_LABELS } from '../constants/ui.constants.ts'

defineProps<{ translations: Translation[] }>()
</script>

<template>
  <span class="lstrip">
    <span
      v-for="translation in translations"
      :key="translation.language"
      :data-language="translation.language"
      :aria-label="`${translation.language} · ${TEXT_STATE_LABELS[translation.state]}`"
      :class="[
        TEXT_STATE_CLASSES[translation.state],
        { 'is-ai': translation.aiWritten && translation.state !== TEXT_STATES.REVIEWED },
      ]"
      class="lc"
      >{{ translation.language }}</span
    >
  </span>
</template>
