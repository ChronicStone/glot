<script setup lang="ts">
import { Button } from '@ui-sdk/vue/button'
import type { ButtonHTMLAttributes } from 'vue'
import type { ButtonTone } from '../types/ui.types.ts'

const { tone = 'outline', type = 'button' } = defineProps<{
  tone?: ButtonTone
  type?: ButtonHTMLAttributes['type']
}>()
</script>

<template>
  <Button
    :type="type"
    :data-tone="tone"
    class="inline-flex h-9 items-center gap-2 rounded-control px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[tone=outline]:border data-[tone=outline]:border-line-strong data-[tone=outline]:bg-surface data-[tone=outline]:hover:bg-sunken data-[tone=primary]:bg-button data-[tone=primary]:text-button-ink data-[tone=primary]:shadow-card data-[tone=quiet]:text-ink-2 data-[tone=quiet]:hover:bg-sunken"
  >
    <slot />
  </Button>
</template>
