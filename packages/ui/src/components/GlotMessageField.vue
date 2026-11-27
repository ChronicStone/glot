<script setup lang="ts">
import type { Syntax } from '@glot/checks'
import { onMounted, useTemplateRef, watch } from 'vue'
import { fieldParts, serializeField } from '../utils/message-field.utils.ts'

const { syntax, label, invalid, multiline } = defineProps<{
  syntax?: Syntax | undefined
  label: string
  invalid?: boolean | undefined
  multiline?: boolean | undefined
}>()

const model = defineModel<string>({ required: true })
const editable = useTemplateRef<HTMLDivElement>('editable')

function render(value: string) {
  const root = editable.value

  if (!root) {
    return
  }

  root.replaceChildren(
    ...fieldParts(value, syntax).map((part) => {
      if (!part.locked) {
        return document.createTextNode(part.raw)
      }

      const chip = document.createElement('span')

      chip.className = part.raw.startsWith('<') ? 'ph tag' : 'ph'
      chip.contentEditable = 'false'
      chip.dataset.raw = part.raw
      chip.textContent = part.label

      return chip
    }),
  )
}

function caretToEnd() {
  const root = editable.value
  const selection = document.getSelection()

  if (root && selection) {
    selection.selectAllChildren(root)
    selection.collapseToEnd()
  }
}

function changed() {
  const root = editable.value

  if (!root) {
    return
  }

  const value = serializeField(root)
  const chips = root.querySelectorAll('[data-raw]').length
  const wanted = fieldParts(value, syntax).filter((part) => part.locked).length

  model.value = value

  if (chips !== wanted) {
    render(value)
    caretToEnd()
  }
}

watch(model, (value) => {
  if (editable.value && serializeField(editable.value) !== value) {
    render(value)
  }
})

onMounted(() => render(model.value))
</script>

<template>
  <div :class="{ 'is-error': invalid, textarea: multiline }" class="input msg-field">
    <div
      ref="editable"
      class="msg-edit"
      contenteditable="plaintext-only"
      role="textbox"
      :aria-label="label"
      :aria-invalid="Boolean(invalid)"
      :aria-multiline="Boolean(multiline)"
      spellcheck="true"
      @input="changed"
      @keydown.enter="multiline || $event.preventDefault()"
    />
  </div>
</template>
