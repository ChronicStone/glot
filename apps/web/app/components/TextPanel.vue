<script setup lang="ts">
import type { Text } from '@glot/contract'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'

defineProps<{ text: Text }>()

const emit = defineEmits<{ close: [] }>()
const session = useNuxtApp().$auth.useSession()
const { write, approve } = useRights()
const details = ref<boolean>(false)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col" aria-label="Text">
    <header class="border-b border-line px-4 pt-3 pb-4 md:px-6 md:pt-4">
      <div class="flex items-center gap-2">
        <span class="min-w-0 flex-1 truncate text-xs text-muted">{{ text.where }}</span>
        <UButton
          label="Details"
          color="neutral"
          :variant="details ? 'soft' : 'ghost'"
          size="sm"
          @click="details = !details"
        />
        <UButton
          icon="i-lucide-x"
          aria-label="Close"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('close')"
        />
      </div>
      <GlotTextValue
        :value="text.source.value"
        class="mt-2 block text-[18px] leading-snug font-semibold tracking-tight [overflow-wrap:anywhere]"
      />
      <div class="mt-3 flex flex-wrap gap-1.5">
        <UBadge
          v-for="app in text.shownIn"
          :key="app"
          :label="app"
          color="neutral"
          variant="outline"
        />
      </div>
      <dl
        v-if="details"
        class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-control bg-sunken px-3 py-2 text-xs"
      >
        <dt class="text-ink-3">Source</dt>
        <dd class="font-mono break-all">{{ text.key.source }}</dd>
        <dt class="text-ink-3">Key</dt>
        <dd class="font-mono break-all">{{ text.key.path.join(' › ') }}</dd>
      </dl>
    </header>
    <ul class="min-h-0 flex-1 overflow-auto px-2 py-2 md:px-3">
      <TextLanguage
        v-for="translation in text.translations"
        :key="translation.language"
        :text="text"
        :translation="translation"
        :user-id="session.data?.user.id"
        :can-write="write.includes(translation.language)"
        :can-approve="approve.includes(translation.language)"
      />
    </ul>
  </section>
</template>
