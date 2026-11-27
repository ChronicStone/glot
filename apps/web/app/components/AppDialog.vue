<script setup lang="ts">
defineProps<{
  title: string
  description?: string | undefined
  icon?: string
  tone?: string
  side?: boolean
  wide?: boolean
}>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :overlay="false"
    :ui="{ content: 'bg-transparent ring-0 shadow-none divide-y-0' }"
    :title="title"
    :description="description ?? title"
  >
    <template #content>
      <div class="scrim" @click="open = false" />
      <div :class="[side ? 'slide' : 'dialog', { wide }]">
        <div class="dialog-h">
          <span v-if="icon" :class="tone" class="ico-tile"><UIcon :name="icon" /></span>
          <div>
            <h2>{{ title }}</h2>
            <p v-if="description">{{ description }}</p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-icon"
            style="margin-left: auto"
            aria-label="Close"
            @click="open = false"
          >
            <UIcon name="i-lucide-x" />
          </button>
        </div>
        <div class="dialog-b" :style="side ? { flex: 1, overflow: 'auto' } : undefined">
          <slot />
        </div>
        <div v-if="$slots.footer" class="dialog-f"><slot name="footer" /></div>
      </div>
    </template>
  </UModal>
</template>
