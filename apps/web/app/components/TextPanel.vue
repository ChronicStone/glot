<script setup lang="ts">
import type { Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotMessageField from '@glot/ui/components/GlotMessageField.vue'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { useMutation } from '@tanstack/vue-query'
import { TEXT_PANEL_TABS, TEXT_STATE_PRIORITY } from '../constants/texts.constants.ts'

const { text } = defineProps<{ text: Text; closable?: boolean }>()

const emit = defineEmits<{ close: [] }>()
const { $api } = useNuxtApp()
const { write, approve } = useRights()
const tab = ref<string>(TEXT_PANEL_TABS.LANGUAGES)
const chosen = ref<string | undefined>()
const body = ref<string>('')
const commenting = ref<boolean>(false)
const showReviewed = ref<boolean>(false)
const { copy, copied } = useClipboard()

const key = computed(() => text.key.path.join('.'))

const ordered = computed(() =>
  text.translations.toSorted(
    (left, right) => TEXT_STATE_PRIORITY[left.state] - TEXT_STATE_PRIORITY[right.state],
  ),
)

const pending = computed(() => ordered.value.filter(({ state }) => state !== TEXT_STATES.REVIEWED))
const reviewed = computed(() => ordered.value.filter(({ state }) => state === TEXT_STATES.REVIEWED))

const working = computed(
  () =>
    text.translations.find(({ language }) => language === chosen.value) ??
    pending.value.find(
      ({ language }) => write.value.includes(language) || approve.value.includes(language),
    ) ??
    pending.value[0],
)

const {
  form,
  value,
  invalid,
  error,
  changed,
  own,
  canWrite,
  canApprove,
  target,
  done,
  failed,
  approveNow,
  sendNow,
  saveNow,
} = useTextEditor({
  text: () => text,
  translation: () => working.value,
  onDone: () => {
    commenting.value = false
    body.value = ''
  },
})

const [DefineEditor, UseEditor] = createReusableTemplate()

const commentNow = useMutation(
  $api.reviews.comment.mutationOptions({ onSuccess: () => done('Comment added'), onError: failed }),
)

defineShortcuts({
  a: () => canApprove.value && !invalid.value && approveNow.mutate(),
})
</script>

<template>
  <DefineEditor>
    <form.Field v-slot="{ field }" name="value">
      <GlotMessageField
        :model-value="field.state.value"
        :syntax="text.syntax"
        :label="`${languageName(working?.language ?? '')} text`"
        :invalid="Boolean(error)"
        @update:model-value="field.handleChange"
      />
      <p v-if="error" class="hint err" role="alert">{{ error }}</p>
    </form.Field>
  </DefineEditor>
  <div class="insp-h">
    <span class="insp-key"
      ><span class="key">{{ key }}</span
      ><button
        type="button"
        class="btn btn-ghost btn-xs btn-icon"
        :title="copied ? 'Copied' : 'Copy the key'"
        @click="copy(key)"
      >
        <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" /></button
    ></span>
    <AppSegmented
      v-model="tab"
      :items="Object.values(TEXT_PANEL_TABS).map((value) => ({ label: value, value }))"
    />
    <button
      v-if="closable"
      type="button"
      class="btn btn-ghost btn-sm btn-icon"
      aria-label="Close"
      @click="emit('close')"
    >
      <UIcon name="i-lucide-x" />
    </button>
  </div>
  <div class="insp-fr"><GlotTextValue :value="text.source.value" :syntax="text.syntax" /></div>
  <div class="insp-where">
    <span class="w"><UIcon name="i-lucide-file-json" class="ic-13" />{{ text.key.source }}</span>
    <span v-for="app in text.shownIn" :key="app" class="w"><b>{{ app }}</b></span>
  </div>

  <div v-if="tab === TEXT_PANEL_TABS.LANGUAGES" class="insp-body">
    <TextLanguage
      v-for="translation in pending"
      :key="translation.language"
      :translation="translation"
      :working="translation.language === working?.language"
      :editable="canWrite || canApprove"
      :own-draft="own && translation.language === working?.language"
      :field-error="translation.language === working?.language ? error : undefined"
      :syntax="text.syntax"
      @select="chosen = translation.language"
    >
      <template #editor><UseEditor /></template>
      <div v-if="commenting && translation.language === working?.language" class="editor">
        <label class="input textarea">
          <textarea v-model="body" rows="2" placeholder="Write a comment" aria-label="Comment" />
        </label>
      </div>
      <AiSuggest
        v-else-if="translation.language === working?.language && (canWrite || canApprove)"
        :target="target"
        :syntax="text.syntax"
        @use="form.setFieldValue('value', $event)"
      />
    </TextLanguage>
    <button
      v-if="reviewed.length > 0 && !showReviewed"
      type="button"
      class="lrow"
      @click="showReviewed = true"
    >
      <span class="lstrip"
        ><span
          v-for="translation in reviewed"
          :key="translation.language"
          :class="TEXT_STATE_CLASSES[translation.state]"
          class="lc"
          >{{ translation.language }}</span
        ></span
      >
      <span class="vals"
        ><template v-for="(translation, index) in reviewed" :key="translation.language"
          ><span v-if="index > 0" class="sep">·</span>{{ translation.value }}</template
        ></span
      >
      <AppStatePill :state="TEXT_STATES.REVIEWED" />
      <UIcon name="i-lucide-chevron-down" />
    </button>
    <template v-if="showReviewed">
      <TextLanguage
        v-for="translation in reviewed"
        :key="translation.language"
        :translation="translation"
        :working="translation.language === working?.language"
        :editable="canWrite || canApprove"
        :own-draft="false"
        :field-error="translation.language === working?.language ? error : undefined"
        :syntax="text.syntax"
        @select="chosen = translation.language"
      >
        <template #editor><UseEditor /></template>
      </TextLanguage>
    </template>
  </div>
  <div v-else-if="tab === TEXT_PANEL_TABS.HISTORY" class="insp-body" style="padding: 6px 20px 12px">
    <TextHistory :text="text" />
  </div>
  <TextDetails v-else :text="text" />

  <div class="insp-foot">
    <div class="m">
      <template v-if="text.shownIn.length > 0"
        >Ships to {{ counted({ count: text.shownIn.length, one: 'app', other: 'apps' }) }}<br />with
        the next release</template
      ><template v-else>Ships with the next release</template>
    </div>
    <div v-if="working && commenting" class="btns">
      <button type="button" class="btn btn-ghost" @click="commenting = false">Cancel</button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'is-loading': commentNow.isPending.value }"
        :disabled="!body.trim()"
        @click="commentNow.mutate({ ...target, body })"
      >
        Comment
      </button>
    </div>
    <div v-else-if="working && canApprove" class="btns">
      <button type="button" class="btn btn-ghost" @click="commenting = true">Comment</button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'is-loading': approveNow.isPending.value }"
        :disabled="invalid"
        @click="approveNow.mutate()"
      >
        <UIcon name="i-lucide-check" />Approve<span class="kbd">A</span>
      </button>
    </div>
    <div v-else-if="working && canWrite" class="btns">
      <button
        type="button"
        class="btn btn-ghost"
        :class="{ 'is-loading': saveNow.isPending.value }"
        :disabled="!changed || invalid"
        @click="saveNow.mutate()"
      >
        Save draft
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'is-loading': sendNow.isPending.value }"
        :disabled="invalid"
        @click="sendNow.mutate()"
      >
        Send for review
      </button>
    </div>
  </div>
</template>
