<script setup lang="ts">
import { messageSegments } from '@glot/checks'
import { onMounted, useTemplateRef, watch } from 'vue'
import { CARET_STOP } from '../constants/widget.constants.ts'
import { placeholderToken, serializeEditable } from '../utils/message.utils.ts'

const { autofocus = true } = defineProps<{ autofocus?: boolean }>()
const model = defineModel<string>({ required: true })
const editable = useTemplateRef<HTMLDivElement>('editable')

function render(value: string) {
  const root = editable.value

  if (!root) {
    return
  }

  const segments = messageSegments(value)

  root.replaceChildren(
    ...segments.map((segment) => {
      if (!segment.placeholder) {
        return document.createTextNode(segment.value)
      }

      const chip = document.createElement('span')

      chip.className = 'ph'
      chip.contentEditable = 'false'
      chip.dataset.token = placeholderToken(segment.value)
      chip.textContent = segment.value

      return chip
    }),
    document.createTextNode(segments.at(-1)?.placeholder ? CARET_STOP : ''),
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

  const value = serializeEditable(root)
  const chips = root.querySelectorAll('[data-token]').length
  const wanted = messageSegments(value).filter((segment) => segment.placeholder).length

  model.value = value

  if (chips !== wanted) {
    render(value)
    caretToEnd()
  }
}

watch(model, (value) => {
  if (editable.value && serializeEditable(editable.value) !== value) {
    render(value)
  }
})

onMounted(() => {
  render(model.value)

  if (autofocus) {
    editable.value?.focus()
    caretToEnd()
  }
})
</script>

<template>
  <div
    ref="editable"
    class="grow"
    contenteditable="plaintext-only"
    role="textbox"
    aria-multiline="true"
    spellcheck="true"
    data-glot="message"
    :style="{
      outline: 'none',
      minWidth: 0,
      padding: '7px 0',
      lineHeight: '22px',
      whiteSpace: 'pre-wrap',
    }"
    @input="changed"
  />
</template>
