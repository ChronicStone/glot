<script setup lang="ts">
import { PREVIEW_FRAME_STYLE } from '../constants/emails.constants.ts'

const { html, selectedId, missingIds, width } = defineProps<{
  html: string
  selectedId: string | undefined
  missingIds: string[]
  width: number
}>()

const emit = defineEmits<{ select: [textId: string] }>()
const frame = useTemplateRef<HTMLIFrameElement>('frame')
const height = ref<number>(480)

function highlight() {
  const document = frame.value?.contentDocument

  for (const element of document?.querySelectorAll('[data-glot-text]') ?? []) {
    const id = element.getAttribute('data-glot-text') ?? ''

    element.classList.toggle('glot-on', id === selectedId)
    element.classList.toggle('glot-missing', missingIds.includes(id))
  }
}

function wire() {
  const document = frame.value?.contentDocument

  if (!document) {
    return
  }

  const style = document.createElement('style')

  style.textContent = PREVIEW_FRAME_STYLE
  document.head.append(style)
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : undefined
    const text = target?.closest('[data-glot-text]')

    event.preventDefault()

    if (text) {
      emit('select', text.getAttribute('data-glot-text') ?? '')
    }
  })
  height.value = document.documentElement.scrollHeight
  highlight()
}

watch(() => [selectedId, missingIds], highlight)
</script>

<template>
  <iframe
    ref="frame"
    :srcdoc="html"
    sandbox="allow-same-origin"
    title="Email preview"
    class="em-frame"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @load="wire"
  />
</template>
