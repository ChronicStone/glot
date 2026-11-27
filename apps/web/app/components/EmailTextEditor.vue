<script setup lang="ts">
import { SMS_ALPHABETS, smsLength } from '@glot/checks'
import type { Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotMessageField from '@glot/ui/components/GlotMessageField.vue'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { formatTimeAgo } from '@vueuse/core'
import { CURLY_APOSTROPHE, STRAIGHT_APOSTROPHE } from '../constants/emails.constants.ts'

const { text, language, sms } = defineProps<{
  text: Text
  language: string
  number: number
  sms?: string | undefined
}>()

const emit = defineEmits<{ typing: [value: string]; close: [] }>()

const { project } = useCurrentProject()

const translation = computed(() =>
  text.translations.find((candidate) => candidate.language === language),
)

const { form, value, invalid, error, changed, canWrite, canApprove, approveNow, sendNow, saveNow } =
  useTextEditor({ text: () => text, translation: () => translation.value })

const length = computed(() => (sms === undefined ? undefined : smsLength(sms)))

const onlyCurly = computed(
  () =>
    length.value?.unicodeCharacters.length === 1 &&
    length.value.unicodeCharacters[0] === CURLY_APOSTROPHE,
)

const straight = computed(() =>
  sms === undefined ? undefined : smsLength(sms.replaceAll(CURLY_APOSTROPHE, STRAIGHT_APOSTROPHE)),
)

const gsmPerMessage = smsLength('').perMessage

const usage = computed(() => {
  if (!length.value) {
    return []
  }

  const first = Math.min(length.value.length, length.value.perMessage)

  return [
    { tone: 'ok', size: first },
    { tone: 'fix', size: length.value.length - first },
    { tone: 'miss', size: length.value.messages * length.value.perMessage - length.value.length },
  ].filter(({ size }) => size > 0)
})

const byline = computed(() => {
  const draft = translation.value?.draft

  if (draft) {
    return `${draft.authorName} · ${formatTimeAgo(new Date(draft.updatedAt))}`
  }

  return translation.value?.state === TEXT_STATES.REVIEWED && translation.value.reviewerName
    ? `Approved by ${translation.value.reviewerName}`
    : undefined
})

watch(value, (next) => emit('typing', next))
</script>

<template>
  <div class="et on">
    <div class="row-flex">
      <span class="n">{{ number }}</span>
      <span :class="translation ? TEXT_STATE_CLASSES[translation.state] : 'plain'" class="lc">{{
        language
      }}</span>
      <span style="font-weight: 500">{{ languageName(language) }}</span>
      <AppStatePill v-if="translation" :state="translation.state" />
      <span class="g-grow" />
      <span v-if="byline" class="muted" style="font-size: 12px">{{ byline }}</span>
    </div>
    <form.Field v-if="canWrite || canApprove" v-slot="{ field }" name="value">
      <GlotMessageField
        :model-value="field.state.value"
        :syntax="text.syntax"
        :label="`${languageName(language)} text`"
        :invalid="Boolean(error)"
        multiline
        style="width: 100%"
        @update:model-value="field.handleChange"
      />
      <p v-if="error" class="hint err" role="alert">{{ error }}</p>
      <div v-if="length" class="sms-count" style="width: 100%">
        <div class="stats" style="width: 100%">
          <div class="stat">
            <div class="l">Characters</div>
            <div class="v" style="font-size: 18px">
              {{ length.length }}<small> / {{ length.perMessage }}</small>
            </div>
          </div>
          <div class="stat">
            <div class="l">Messages</div>
            <div :class="{ 'text-fix': length.messages > 1 }" class="v" style="font-size: 18px">
              {{ length.messages }}
            </div>
          </div>
          <div class="stat">
            <div class="l">Alphabet</div>
            <div class="v" style="font-size: 18px">{{ length.alphabet }}</div>
          </div>
        </div>
      </div>
      <div v-if="length" class="sbar" style="width: 100%">
        <i
          v-for="part in usage"
          :key="part.tone"
          :class="`bg-${part.tone}`"
          :style="{ flex: part.size }"
        />
      </div>
      <div
        v-if="length && length.alphabet === SMS_ALPHABETS.UNICODE"
        class="check-fail"
        style="width: 100%"
      >
        <UIcon name="i-lucide-type" />
        <div>
          <b
            >{{
              onlyCurly ? `The apostrophe ${CURLY_APOSTROPHE}` : length.unicodeCharacters.join(' ')
            }}
            switches this SMS to Unicode:</b
          >
          {{ length.perMessage }} characters per message instead of {{ gsmPerMessage }}.
          <template v-if="onlyCurly && straight"
            >With a straight {{ STRAIGHT_APOSTROPHE }} it fits in
            {{ straight.messages === 1 ? 'one SMS' : `${straight.messages} SMS` }}.</template
          >
        </div>
      </div>
      <div class="row-flex" style="font-size: 12px; color: var(--glot-ink-3)">
        <UIcon name="i-lucide-lock" class="ic-13" />Placeholders stay as chips · links need a
        Developer
      </div>
      <AiSuggest
        :target="{ projectId: project?.id ?? '', textId: text.id, language }"
        :syntax="text.syntax"
        style="width: 100%"
        @use="field.handleChange"
      />
      <div
        v-if="language !== text.source.language"
        class="well"
        style="width: 100%; font-size: 13px"
      >
        <div class="muted" style="font-size: 12px; margin-bottom: 4px">
          {{ languageName(text.source.language) }}
        </div>
        <GlotTextValue :value="text.source.value" :syntax="text.syntax" />
      </div>
      <div class="row-flex">
        <button
          v-if="onlyCurly"
          type="button"
          class="btn btn-outline btn-sm"
          @click="field.handleChange(value.replaceAll(CURLY_APOSTROPHE, STRAIGHT_APOSTROPHE))"
        >
          <UIcon name="i-lucide-wand-sparkles" />Use {{ STRAIGHT_APOSTROPHE }} instead
        </button>
        <span class="g-grow" />
        <button type="button" class="btn btn-ghost btn-sm" @click="emit('close')">Cancel</button>
        <button
          v-if="canWrite && !canApprove"
          type="button"
          class="btn btn-outline btn-sm"
          :class="{ 'is-loading': saveNow.isPending.value }"
          :disabled="!changed || invalid"
          @click="saveNow.mutate()"
        >
          Save draft
        </button>
        <button
          v-if="canApprove"
          type="button"
          class="btn btn-primary btn-sm"
          :class="{ 'is-loading': approveNow.isPending.value }"
          :disabled="invalid"
          @click="approveNow.mutate()"
        >
          <UIcon name="i-lucide-check" />Approve
        </button>
        <button
          v-else-if="canWrite"
          type="button"
          class="btn btn-primary btn-sm"
          :class="{ 'is-loading': sendNow.isPending.value }"
          :disabled="invalid"
          @click="sendNow.mutate()"
        >
          Send for review
        </button>
      </div>
    </form.Field>
    <GlotTextValue v-else :value="translation?.value ?? text.source.value" :syntax="text.syntax" />
  </div>
</template>
