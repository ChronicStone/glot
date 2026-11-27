<script setup lang="ts" generic="TValue extends string">
defineProps<{
  items: { label: string; value: TValue; count?: number; icon?: string }[]
  small?: boolean
}>()

const model = defineModel<TValue>({ required: true })
const track = useTemplateRef<HTMLDivElement>('track')
const { arrivedState, measure } = useScroll(track)
const { width } = useElementSize(track)

const fades = computed(() => {
  const overflows = (track.value?.scrollWidth ?? 0) > width.value + 1

  return {
    'fade-l': overflows && !arrivedState.left,
    'fade-r': overflows && !arrivedState.right,
  }
})

watch(width, () => measure())

watch(
  model,
  async () => {
    await nextTick()
    track.value?.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="track" :class="[{ 'seg-sm': small }, fades]" class="seg" role="tablist">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="model === item.value"
      :class="{ on: model === item.value }"
      :aria-label="item.icon ? item.label : undefined"
      :title="item.icon ? item.label : undefined"
      @click="model = item.value"
    >
      <UIcon v-if="item.icon" :name="item.icon" class="ic-14" /><template v-else>{{
        item.label
      }}</template
      ><span v-if="item.count !== undefined" class="count">{{ item.count }}</span>
    </button>
  </div>
</template>
