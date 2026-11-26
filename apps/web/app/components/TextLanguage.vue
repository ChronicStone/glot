<script setup lang="ts">
import type { Text, Translation } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_LABELS, TEXT_STATE_TONES } from '@glot/ui/constants'
import { useMutation, useQuery } from '@tanstack/vue-query'

const { text, translation, userId, canWrite, canApprove } = defineProps<{
  text: Text
  translation: Translation
  userId: string | undefined
  canWrite: boolean
  canApprove: boolean
}>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const { project } = useCurrentProject()
const mode = ref<'view' | 'edit' | 'change'>('view')
const value = ref<string>('')
const body = ref<string>('')

const target = computed(() => ({
  projectId: project.value?.id ?? '',
  textId: text.id,
  language: translation.language,
}))

const draft = computed(() => translation.draft)
const own = computed(() => draft.value?.authorId === userId)
const sent = computed(() => draft.value?.status === DRAFT_STATUSES.IN_REVIEW)

const reviewable = computed(
  () => canApprove && (sent.value || translation.state === TEXT_STATES.TO_CHECK),
)

const draftLabel = computed(() => {
  if (!draft.value) {
    return ''
  }

  if (!sent.value) {
    return 'Your draft · only you see it'
  }

  return own.value ? 'Sent for review' : `Sent for review by ${draft.value.authorName}`
})

const comments = useQuery(() => ({
  ...$api.reviews.comments.queryOptions({ input: target.value }),
  enabled: Boolean(project.value),
}))

const recent = computed(() => (comments.data.value ?? []).slice(-3))

async function refresh() {
  mode.value = 'view'

  await Promise.all([
    $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
    $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
  ])
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

function edit() {
  value.value = (own.value ? draft.value?.value : translation.value) ?? translation.value ?? ''
  mode.value = 'edit'
}

function saveCurrent() {
  return $api.drafts.save.call({ ...target.value, value: value.value })
}

const save = useMutation({ mutationFn: saveCurrent, onSuccess: refresh, onError: failed })

const send = useMutation({
  mutationFn: async () =>
    $api.drafts.send.call({ projectId: target.value.projectId, draftId: (await saveCurrent()).id }),
  onSuccess: refresh,
  onError: failed,
})

const sendSaved = useMutation({
  mutationFn: () =>
    $api.drafts.send.call({ projectId: target.value.projectId, draftId: draft.value?.id ?? '' }),
  onSuccess: refresh,
  onError: failed,
})

const withdraw = useMutation({
  mutationFn: () =>
    $api.drafts.withdraw.call({
      projectId: target.value.projectId,
      draftId: draft.value?.id ?? '',
    }),
  onSuccess: refresh,
  onError: failed,
})

const approve = useMutation({
  mutationFn: () =>
    $api.reviews.approve.call({
      ...target.value,
      ...(sent.value && draft.value ? { draftId: draft.value.id } : {}),
    }),
  onSuccess: refresh,
  onError: failed,
})

const approveEdited = useMutation({
  mutationFn: () => $api.reviews.editAndApprove.call({ ...target.value, value: value.value }),
  onSuccess: refresh,
  onError: failed,
})

const askChange = useMutation({
  mutationFn: () =>
    $api.reviews.requestChange.call({
      ...target.value,
      body: body.value,
      ...(sent.value && draft.value ? { draftId: draft.value.id } : {}),
    }),
  onSuccess: async () => {
    body.value = ''
    await refresh()
  },
  onError: failed,
})
</script>

<template>
  <li
    class="grid grid-cols-[auto_1fr] gap-3 rounded-card px-2 py-3 md:px-3"
    :class="mode === 'view' ? '' : 'bg-muted'"
  >
    <span
      :class="TEXT_STATE_TONES[translation.state]"
      class="grid h-5 w-7 place-items-center rounded-md font-mono text-[10.5px] font-semibold"
      >{{ translation.language }}</span
    >
    <div class="min-w-0">
      <GlotTextValue
        v-if="translation.value"
        :value="translation.value"
        class="block text-[14px] leading-snug [overflow-wrap:anywhere]"
      />
      <p v-else class="text-muted">No {{ languageName(translation.language) }} text yet.</p>
      <p class="mt-1 text-xs text-muted">
        {{ languageName(translation.language) }} · {{ TEXT_STATE_LABELS[translation.state] }}
        <template v-if="translation.selfApproved"> · approved by its author</template>
        <template v-if="translation.aiWritten"> · written by AI</template>
      </p>
      <p
        v-for="failure in translation.failures"
        :key="failure.code"
        class="mt-1 text-xs text-error"
      >
        {{ failure.message }}
      </p>
      <div
        v-if="draft && mode === 'view'"
        class="mt-2 rounded-control border border-default bg-default px-3 py-2"
      >
        <p class="text-xs text-muted">{{ draftLabel }}</p>
        <GlotTextValue
          :value="draft.value"
          class="mt-0.5 block text-[14px] leading-snug [overflow-wrap:anywhere]"
        />
        <p v-for="failure in draft.failures" :key="failure.code" class="mt-1 text-xs text-error">
          {{ failure.message }}
        </p>
      </div>
      <ul v-if="recent.length > 0 && mode !== 'edit'" class="mt-2 flex flex-col gap-1">
        <li v-for="comment in recent" :key="comment.id" class="text-xs text-muted">
          <span class="font-medium text-default">{{ comment.authorName }}</span>
          <template v-if="comment.kind === 'CHANGE_REQUEST'"> asks for a change</template>
          · {{ comment.body }}
        </li>
      </ul>
      <div v-if="mode === 'edit'" class="mt-3 flex flex-col gap-2">
        <div class="contents" @keydown.meta.enter.prevent="send.mutate()">
          <UTextarea
            v-model="value"
            autofocus
            autoresize
            :rows="2"
            class="w-full"
            :aria-label="`${languageName(translation.language)} text`"
          />
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            label="Send for review"
            color="neutral"
            size="sm"
            :disabled="!value.trim()"
            :loading="send.isPending.value"
            @click="send.mutate()"
          />
          <UButton
            label="Save draft"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!value.trim()"
            :loading="save.isPending.value"
            @click="save.mutate()"
          />
          <UButton
            v-if="canApprove"
            label="Approve"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!value.trim()"
            :loading="approveEdited.isPending.value"
            @click="approveEdited.mutate()"
          />
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="mode = 'view'"
          />
        </div>
      </div>
      <div v-else-if="mode === 'change'" class="mt-3 flex flex-col gap-2">
        <UTextarea
          v-model="body"
          autofocus
          autoresize
          :rows="2"
          placeholder="What should change"
          class="w-full"
          aria-label="What should change"
        />
        <div class="flex gap-1.5">
          <UButton
            label="Ask for a change"
            color="neutral"
            size="sm"
            :disabled="!body.trim()"
            :loading="askChange.isPending.value"
            @click="askChange.mutate()"
          />
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="mode = 'view'"
          />
        </div>
      </div>
      <div v-else class="mt-2 flex flex-wrap gap-1.5">
        <UButton
          v-if="canWrite"
          label="Edit"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          size="sm"
          @click="edit"
        />
        <UButton
          v-if="own && draft?.status === DRAFT_STATUSES.DRAFT"
          label="Send for review"
          color="neutral"
          size="sm"
          :disabled="draft.failures.length > 0"
          :loading="sendSaved.isPending.value"
          @click="sendSaved.mutate()"
        />
        <UButton
          v-if="reviewable"
          label="Approve"
          icon="i-lucide-check"
          color="neutral"
          size="sm"
          :loading="approve.isPending.value"
          @click="approve.mutate()"
        />
        <UButton
          v-if="reviewable"
          label="Ask for a change"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="mode = 'change'"
        />
        <UButton
          v-if="own && draft"
          label="Withdraw"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="withdraw.isPending.value"
          @click="withdraw.mutate()"
        />
      </div>
    </div>
  </li>
</template>
