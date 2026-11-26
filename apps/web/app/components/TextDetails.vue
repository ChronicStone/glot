<script setup lang="ts">
import type { Text } from '@glot/contract'

const { text } = defineProps<{ text: Text }>()

const { project } = useCurrentProject()
const { copy } = useClipboard()
const key = computed(() => text.key.path.join('.'))
const source = computed(() => project.value?.sources.find(({ name }) => name === text.key.source))

const files = computed(() =>
  (source.value?.languages ?? []).map((language) =>
    (source.value?.pathPattern ?? '').replace('{locale}', language),
  ),
)
</script>

<template>
  <div class="insp-body" style="padding: 6px 20px 12px; gap: 14px">
    <div class="field">
      <span class="label">Key</span>
      <div class="keywell">
        <span>{{ key }}</span
        ><button
          type="button"
          class="btn btn-ghost btn-xs btn-icon"
          title="Copy the key"
          @click="copy(key)"
        >
          <UIcon name="i-lucide-copy" />
        </button>
      </div>
    </div>
    <div class="field">
      <span class="label">Source</span>
      <div class="row-flex" style="gap: 8px">
        <span>{{ text.key.source }}</span><span v-if="source" class="tag">{{ source.kind }}</span>
      </div>
    </div>
    <div class="field">
      <span class="label">Files</span>
      <div class="well code" style="padding: 10px 12px">
        <div v-for="file in files" :key="file">{{ file }}</div>
      </div>
    </div>
    <div class="field">
      <span class="label">Shown by</span>
      <div class="rows">
        <div
          v-for="app in text.shownIn"
          :key="app"
          class="r"
          style="padding: 8px 0; font-size: 13px"
        >
          <span class="g-grow">{{ app }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
