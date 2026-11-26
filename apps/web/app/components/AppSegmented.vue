<script setup lang="ts" generic="TValue extends string">
defineProps<{ items: { label: string; value: TValue; count?: number }[]; small?: boolean }>()

const model = defineModel<TValue>({ required: true })
</script>

<template>
  <div :class="{ 'seg-sm': small }" class="seg" role="tablist">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="model === item.value"
      :class="{ on: model === item.value }"
      @click="model = item.value"
    >
      {{ item.label }}<span v-if="item.count !== undefined" class="count">{{ item.count }}</span>
    </button>
  </div>
</template>
