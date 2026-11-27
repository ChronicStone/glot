<script setup lang="ts">
import type { Syntax } from '@glot/checks'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { useMutation } from '@tanstack/vue-query'
import { API_ERROR_CODES } from '../constants/api.constants.ts'

const { target, syntax } = defineProps<{
  target: { projectId: string; textId: string; language: string }
  syntax?: Syntax | undefined
}>()

const emit = defineEmits<{ use: [value: string] }>()
const { $api } = useNuxtApp()

const suggest = useMutation({ mutationFn: () => $api.ai.suggest.call(target) })
const problem = computed(() => errorCode(suggest.error.value))

function use() {
  if (suggest.data.value) {
    emit('use', suggest.data.value.value)
    suggest.reset()
  }
}

watch(
  () => `${target.textId}|${target.language}`,
  () => suggest.reset(),
)

defineShortcuts({ meta_u: use })
</script>

<template>
  <div v-if="suggest.isPending.value" class="ai-sug" aria-live="polite">
    <UIcon name="i-lucide-loader-circle" class="spark animate-spin" />
    <div class="why" style="margin-top: 0">Asking AI for {{ languageName(target.language) }}…</div>
  </div>
  <div v-else-if="suggest.data.value" class="ai-sug">
    <UIcon name="i-lucide-sparkle" class="spark" />
    <div>
      <div class="v"><GlotTextValue :value="suggest.data.value.value" :syntax="syntax" /></div>
      <div class="why">
        {{ suggest.data.value.failures[0]?.message ?? suggest.data.value.reason }}
      </div>
    </div>
    <button type="button" class="btn btn-outline btn-sm" @click="use">
      Use<span class="kbd">⌘U</span>
    </button>
  </div>
  <div v-else-if="problem === API_ERROR_CODES.CONFLICT" class="ai-sug ai-sug-off">
    <UIcon name="i-lucide-sparkle" class="spark" />
    <div class="why" style="margin-top: 0">{{ suggest.error.value?.message }}</div>
    <NuxtLink to="/settings/ai" class="btn btn-ghost btn-sm">Set up AI</NuxtLink>
  </div>
  <div v-else-if="suggest.isError.value" class="ai-sug ai-sug-off">
    <UIcon name="i-lucide-cloud-off" class="spark" />
    <div class="why" style="margin-top: 0">
      AI suggestions are unavailable right now. Editing and approving still work.
    </div>
    <button type="button" class="btn btn-ghost btn-sm" @click="suggest.mutate()">
      <UIcon name="i-lucide-rotate-cw" />Retry
    </button>
  </div>
  <button v-else type="button" class="btn btn-ai btn-sm ai-ask" @click="suggest.mutate()">
    <UIcon name="i-lucide-sparkle" />Suggest with AI
  </button>
</template>
