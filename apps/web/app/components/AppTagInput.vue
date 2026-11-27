<script setup lang="ts">
const model = defineModel<string[]>({ required: true })

defineProps<{ placeholder?: string; label: string; disabled?: boolean }>()

const draft = ref<string>('')

function add() {
  const word = draft.value.trim()

  if (word && !model.value.includes(word)) {
    model.value = [...model.value, word]
  }

  draft.value = ''
}

function removeLast() {
  if (!draft.value && model.value.length > 0) {
    model.value = model.value.slice(0, -1)
  }
}
</script>

<template>
  <label :class="{ 'is-disabled': disabled }" class="input tag-input">
    <span v-for="word in model" :key="word" class="avoid-tag"
      ><s>{{ word }}</s
      ><button
        v-if="!disabled"
        type="button"
        class="x"
        :aria-label="`Remove ${word}`"
        @click="model = model.filter((item) => item !== word)"
      >
        <UIcon name="i-lucide-x" class="ic-13" /></button
    ></span>
    <input
      v-model="draft"
      :disabled="disabled"
      :placeholder="model.length === 0 && !disabled ? placeholder : ''"
      :aria-label="label"
      @keydown.enter.prevent="add"
      @keydown.,.prevent="add"
      @keydown.backspace="removeLast"
      @blur="add"
    />
  </label>
</template>
