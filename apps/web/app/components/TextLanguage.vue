<script setup lang="ts">
import type { Translation } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { formatTimeAgo } from '@vueuse/core'

const { translation } = defineProps<{
  translation: Translation
  working: boolean
  editable: boolean
  ownDraft: boolean
}>()

const emit = defineEmits<{ select: [] }>()

const byline = computed(() => {
  const draft = translation.draft

  if (draft) {
    const when = formatTimeAgo(new Date(draft.updatedAt))

    return {
      name: draft.authorName,
      label: `${draft.authorName} · ${draft.status === DRAFT_STATUSES.IN_REVIEW ? 'sent' : 'draft'} ${when}`,
    }
  }

  return translation.reviewerName
    ? { name: translation.reviewerName, label: translation.reviewerName }
    : undefined
})
</script>

<template>
  <div
    :class="{ work: working }"
    class="lcard"
    :role="working ? undefined : 'button'"
    @click="working || emit('select')"
  >
    <div class="lcard-h">
      <span :class="TEXT_STATE_CLASSES[translation.state]" class="lc">{{
        translation.language
      }}</span>
      <span class="nm">{{ languageName(translation.language) }}</span>
      <AppStatePill :state="translation.state" />
      <span v-if="translation.selfApproved" class="pill warn">Self-approved</span>
      <span v-if="byline" class="by"
        ><AppAvatar :name="byline.name" size="sm" />{{ byline.label }}</span
      >
    </div>
    <div v-if="working && editable" class="editor">
      <slot name="editor" />
    </div>
    <div v-else-if="translation.value" class="val">
      <GlotTextValue :value="translation.value" />
    </div>
    <div v-else class="val muted" style="font-size: 13px">
      No {{ languageName(translation.language) }} text yet.
    </div>
    <div v-for="failure in translation.failures" :key="failure.code" class="check-fail">
      <UIcon name="i-lucide-triangle-alert" />
      <div>
        <b>{{ failure.message }}</b>
      </div>
    </div>
    <div v-if="translation.draft && !ownDraft" class="well" style="margin-top: 10px">
      <div class="hint">{{ translation.draft.authorName }} sent this for review</div>
      <div class="val" style="margin-top: 2px">
        <GlotTextValue :value="translation.draft.value" />
      </div>
    </div>
    <div
      v-for="failure in translation.draft?.failures ?? []"
      :key="failure.code"
      class="check-fail"
    >
      <UIcon name="i-lucide-triangle-alert" />
      <div>
        <b>{{ failure.message }}</b>
      </div>
    </div>
    <slot />
  </div>
</template>
