<script setup lang="ts">
defineProps<{
  option: {
    label: string
    native?: string
    description?: string
    code?: string
    tone?: string
    icon?: string
    iconTone?: string
    context?: string
    contextLabel?: string
    bars?: Record<string, number>
    locked?: boolean
  }
  multiple?: boolean
  selected?: boolean
}>()
</script>

<template>
  <span class="vis">
    <span v-if="option.code" :class="option.tone ?? 'plain'" class="lc">{{ option.code }}</span>
    <span v-else-if="option.icon" :class="option.iconTone" class="ico"
      ><UIcon :name="option.icon"
    /></span>
  </span>
  <span class="lbl">
    <div class="t">
      {{ option.label }}<span v-if="option.native" class="native">{{ option.native }}</span>
    </div>
    <div v-if="option.description" class="d">{{ option.description }}</div>
  </span>
  <span class="ctx">
    <span v-if="option.locked"><UIcon name="i-lucide-lock" class="ic-13" /></span>
    <span v-else-if="option.context"
      ><b>{{ option.context }}</b>{{ option.contextLabel ? ` ${option.contextLabel}` : '' }}</span
    >
    <span v-if="option.bars" class="sbar sbar-thin"
      ><i
        v-for="[tone, count] in Object.entries(option.bars).filter(([, value]) => value > 0)"
        :key="tone"
        :class="`bg-${tone}`"
        :style="{ flex: count }"
    /></span>
  </span>
  <span v-if="multiple" class="box"><UIcon v-if="selected" name="i-lucide-check" /></span>
  <UIcon v-else name="i-lucide-check" class="tick" />
</template>
