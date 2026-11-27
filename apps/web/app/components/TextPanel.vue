<script setup lang="ts">
import type { Text } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { TEXT_PANEL_TABS, TEXT_STATE_PRIORITY } from '../constants/texts.constants.ts'

const { text } = defineProps<{ text: Text; closable?: boolean }>()

const emit = defineEmits<{ close: [] }>()
const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const session = useNuxtApp().$auth.useSession()
const { project } = useCurrentProject()
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

const own = computed(() => working.value?.draft?.authorId === session.value.data?.user.id)

const canWrite = computed(() =>
  Boolean(working.value && write.value.includes(working.value.language)),
)

const canApprove = computed(() =>
  Boolean(working.value && approve.value.includes(working.value.language)),
)

const original = computed(
  () => (own.value ? working.value?.draft?.value : working.value?.value) ?? '',
)

const form = useForm({
  defaultValues: { value: original.value },
  validators: {
    onMount: ({ value }) => textCheckError({ source: text.source.value, target: value.value }),
    onChange: ({ value }) => textCheckError({ source: text.source.value, target: value.value }),
  },
})

const value = form.useSelector((state) => state.values.value)
const invalid = form.useSelector((state) => !state.isValid || !state.values.value.trim())
const error = form.useSelector((state) => errorMessage(state.errors))
const changed = computed(() => value.value.trim() !== original.value.trim())
const [DefineEditor, UseEditor] = createReusableTemplate()

watch(original, async (next) => {
  form.reset({ value: next })
  await form.validate('change')
})

const target = computed(() => ({
  projectId: project.value?.id ?? '',
  textId: text.id,
  language: working.value?.language ?? '',
}))

async function done(title: string) {
  commenting.value = false
  body.value = ''
  toast.add({ title, icon: 'i-lucide-circle-check', color: 'success' })

  await Promise.all([
    $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
    $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
  ])
}

function failed(error: Error) {
  toast.add({ title: error.message, icon: 'i-lucide-circle-alert', color: 'error' })
}

const approveNow = useMutation({
  mutationFn: () => {
    const draft = working.value?.draft

    if (changed.value) {
      return $api.reviews.editAndApprove.call({ ...target.value, value: value.value })
    }

    return $api.reviews.approve.call({
      ...target.value,
      ...(draft?.status === DRAFT_STATUSES.IN_REVIEW ? { draftId: draft.id } : {}),
    })
  },
  onSuccess: () => done(`${languageName(target.value.language)} approved`),
  onError: failed,
})

const sendNow = useMutation({
  mutationFn: async () => {
    const saved = await $api.drafts.save.call({ ...target.value, value: value.value })

    return $api.drafts.send.call({ projectId: target.value.projectId, draftId: saved.id })
  },
  onSuccess: () => done('Sent for review'),
  onError: failed,
})

const saveNow = useMutation(
  $api.drafts.save.mutationOptions({ onSuccess: () => done('Draft saved'), onError: failed }),
)

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
      <label :class="{ 'is-error': error }" class="input is-focus"
        ><input
          :value="field.state.value"
          :aria-label="`${languageName(working?.language ?? '')} text`"
          :aria-invalid="Boolean(error)"
          autocomplete="off"
          @input="field.handleChange(inputValue($event))"
      /></label>
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
  <div class="insp-fr"><GlotTextValue :value="text.source.value" /></div>
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
      @select="chosen = translation.language"
    >
      <template #editor><UseEditor /></template>
      <div v-if="commenting && translation.language === working?.language" class="editor">
        <label class="input textarea">
          <textarea v-model="body" rows="2" placeholder="Write a comment" aria-label="Comment" />
        </label>
      </div>
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
    <div class="m">Ships to {{ text.shownIn.length }} apps<br />with the next release</div>
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
        @click="saveNow.mutate({ ...target, value })"
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
