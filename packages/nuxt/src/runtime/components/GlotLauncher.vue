<script setup lang="ts">
import GlotMark from '@glot/ui/components/GlotMark.vue'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import { usePointerDrag } from '../composables/use-pointer-drag.ts'
import type { ScreenPoint } from '../types/widget.types.ts'
import { clampPoint } from '../utils/layout.utils.ts'

const { position } = defineProps<{
  language: string
  fix: number
  check: number
  status: string
  position: ScreenPoint | null
}>()

const emit = defineEmits<{ open: []; move: [point: ScreenPoint] }>()

const button = useTemplateRef<HTMLButtonElement>('button')
const origin = ref<ScreenPoint | null>(null)
const offset = ref<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
const viewport = useWindowSize()
const measured = useElementSize(button, undefined, { box: 'border-box' })

function size() {
  return { width: measured.width.value, height: measured.height.value }
}

const { moved } = usePointerDrag({
  handle: button,
  ignore: null,
  onMove: (delta) => {
    if (!origin.value && button.value) {
      const rect = button.value.getBoundingClientRect()

      origin.value = { x: rect.left, y: rect.top }
    }

    offset.value = delta
  },
  onEnd: (delta) => {
    const start = origin.value ?? { x: 0, y: 0 }

    emit(
      'move',
      clampPoint({ point: { x: start.x + delta.dx, y: start.y + delta.dy }, size: size() }),
    )
    origin.value = null
    offset.value = { dx: 0, dy: 0 }
  },
})

const place = computed(() => {
  const point = origin.value
    ? { x: origin.value.x + offset.value.dx, y: origin.value.y + offset.value.dy }
    : position

  if (!point || viewport.width.value === 0) return {}

  const clamped = clampPoint({ point, size: size() })

  return { left: `${clamped.x}px`, top: `${clamped.y}px`, bottom: 'auto' }
})

function open() {
  if (moved.value) {
    moved.value = false

    return
  }

  emit('open')
}
</script>

<template>
  <button
    ref="button"
    type="button"
    class="w-launch glot-w"
    data-glot="launcher"
    :style="{ ...place, touchAction: 'none', cursor: origin ? 'grabbing' : 'grab' }"
    @click="open"
  >
    <span class="mark"><GlotMark /></span>Glot
    <span class="n">
      <template v-if="status">{{ status }}</template>
      <template v-else>
        <span class="mono">{{ language }}</span>· {{ fix }} to fix · {{ check }} to check
      </template>
    </span>
  </button>
</template>
