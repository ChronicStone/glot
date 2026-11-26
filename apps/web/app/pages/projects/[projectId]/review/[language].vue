<script setup lang="ts">
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import {
  REVIEW_REASON_LABELS,
  REVIEW_SECONDS_PER_TEXT,
  REVIEW_SESSION_PAGE_SIZE,
} from '../../../../constants/review.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useCurrentProject()
const projectId = computed(() => project.value?.id ?? '')
const language = computed(() => String(route.params.language))
const mode = ref<'view' | 'edit' | 'comment'>('view')
const value = ref<string>('')
const body = ref<string>('')
const done = ref<string[]>([])
const skipped = ref<string[]>([])

const focusId = ref<string | undefined>(
  typeof route.query.text === 'string' ? route.query.text : undefined,
)

const queue = useQuery(() => ({
  ...$api.reviews.queue.queryOptions({
    input: {
      projectId: projectId.value,
      language: language.value,
      limit: REVIEW_SESSION_PAGE_SIZE,
    },
  }),
  enabled: Boolean(project.value),
}))

const glossary = useQuery(() => ({
  ...$api.glossary.list.queryOptions({ input: { projectId: projectId.value } }),
  enabled: Boolean(project.value),
}))

type Item = NonNullable<typeof queue.data.value>['items'][number]

function keyOf(item: Item) {
  return `${item.text.id}|${item.draft?.id ?? ''}`
}

const items = computed(() => queue.data.value?.items ?? [])
const remaining = computed(() => items.value.filter((item) => !done.value.includes(keyOf(item))))

const waiting = computed(() =>
  remaining.value.filter((item) => !skipped.value.includes(keyOf(item))),
)

const current = computed(
  () => waiting.value.find((item) => item.text.id === focusId.value) ?? waiting.value[0],
)

const comments = useQuery(() => ({
  ...$api.reviews.comments.queryOptions({
    input: {
      projectId: projectId.value,
      textId: current.value?.text.id ?? '',
      language: language.value,
    },
  }),
  enabled: Boolean(current.value),
}))

const live = computed(
  () =>
    current.value?.text.translations.find((translation) => translation.language === language.value)
      ?.value ?? '',
)

const proposed = computed(() => current.value?.draft?.value ?? live.value)
const forms = computed(() => pluralForms({ language: language.value, value: proposed.value }))

const hits = computed(() => {
  const source = current.value?.text.source.value.toLocaleLowerCase() ?? ''

  return (glossary.data.value ?? []).filter((term) =>
    source.includes(term.name.toLocaleLowerCase()),
  )
})

const position = computed(() => done.value.length + skipped.value.length + 1)
const total = computed(() => done.value.length + (queue.data.value?.total ?? 0))

const minutesLeft = computed(() =>
  Math.max(1, Math.round((waiting.value.length * REVIEW_SECONDS_PER_TEXT) / 60)),
)

const reason = computed(() => {
  const item = current.value

  if (!item) {
    return ''
  }

  return item.draft
    ? `Sent for review by ${item.draft.authorName}`
    : REVIEW_REASON_LABELS[item.reason]
})

watch(
  () => (current.value ? keyOf(current.value) : ''),
  () => {
    mode.value = 'view'
    body.value = ''
  },
)

function target() {
  return {
    projectId: projectId.value,
    textId: current.value?.text.id ?? '',
    language: language.value,
  }
}

function draftId() {
  return current.value?.draft ? { draftId: current.value.draft.id } : {}
}

async function leave(message: string) {
  if (current.value) {
    done.value = [...done.value, keyOf(current.value)]
  }

  focusId.value = undefined
  toast.add({ title: message, color: 'success', icon: 'i-lucide-check' })

  await Promise.all([
    $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
    $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
  ])
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

const approve = useMutation({
  mutationFn: () => $api.reviews.approve.call({ ...target(), ...draftId() }),
  onSuccess: () => leave('Approved'),
  onError: failed,
})

const approveEdited = useMutation({
  mutationFn: () => $api.reviews.editAndApprove.call({ ...target(), value: value.value }),
  onSuccess: () => leave('Approved with your change'),
  onError: failed,
})

const sendEdited = useMutation({
  mutationFn: async () => {
    const saved = await $api.drafts.save.call({ ...target(), value: value.value })

    return $api.drafts.send.call({ projectId: projectId.value, draftId: saved.id })
  },
  onSuccess: () => leave('Sent for review'),
  onError: failed,
})

const askChange = useMutation({
  mutationFn: () =>
    $api.reviews.requestChange.call({ ...target(), ...draftId(), body: body.value }),
  onSuccess: () => leave('Change requested'),
  onError: failed,
})

const comment = useMutation({
  mutationFn: () => $api.reviews.comment.call({ ...target(), body: body.value }),
  onSuccess: async () => {
    body.value = ''
    mode.value = 'view'

    await $queryClient.invalidateQueries({ queryKey: $api.reviews.comments.key() })
  },
  onError: failed,
})

const busy = computed(
  () =>
    approve.isPending.value ||
    approveEdited.isPending.value ||
    sendEdited.isPending.value ||
    askChange.isPending.value,
)

function idle() {
  return Boolean(current.value) && mode.value === 'view' && !busy.value
}

function skip() {
  if (current.value && idle()) {
    skipped.value = [...skipped.value, keyOf(current.value)]
    focusId.value = undefined
  }
}

function edit() {
  if (idle()) {
    value.value = proposed.value
    mode.value = 'edit'
  }
}

function startComment() {
  if (idle()) {
    mode.value = 'comment'
  }
}

function approveCurrent() {
  if (idle()) {
    approve.mutate()
  }
}

function startAgain() {
  skipped.value = []
}

defineShortcuts({
  s: skip,
  e: edit,
  c: startComment,
  a: approveCurrent,
  escape: () => {
    mode.value = 'view'
  },
})
</script>

<template>
  <AppPage id="review-session" :title="`Review · ${languageName(language)}`">
    <template #actions>
      <UButton
        label="End session"
        color="neutral"
        variant="outline"
        :to="{ path: `/projects/${projectId}/review`, query: { language } }"
      />
    </template>
    <div v-if="current" class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
      <div class="flex min-w-0 flex-col gap-4">
        <div class="flex items-center gap-3 text-sm text-muted">
          <span class="tabular-nums">{{ position }} of {{ total }}</span>
          <UProgress
            :model-value="position - 1"
            :max="total"
            size="xs"
            color="neutral"
            class="flex-1"
          />
          <span class="tabular-nums">~{{ minutesLeft }} min left</span>
        </div>
        <section class="overflow-hidden rounded-card border border-default bg-default shadow-card">
          <p class="flex items-center gap-2 bg-muted px-5 py-3 text-sm text-muted">
            <UIcon
              :name="current.draft ? 'i-lucide-send' : 'i-lucide-circle-dot'"
              class="size-4 text-primary"
            />
            {{ reason }}
          </p>
          <div class="flex flex-col gap-1 p-5 sm:p-6">
            <p class="text-sm text-muted">{{ languageName(current.text.source.language) }}</p>
            <GlotTextValue
              :value="current.text.source.value"
              class="text-[20px] leading-snug tracking-tight [overflow-wrap:anywhere]"
            />
            <p class="mt-5 text-sm text-muted">
              {{ languageName(language)
              }}<template v-if="forms.length > 1"> · rendered by the app</template>
            </p>
            <div v-if="mode !== 'edit'" class="flex flex-col gap-2">
              <div
                v-for="form in forms"
                :key="form.label"
                class="grid gap-x-6"
                :class="forms.length > 1 ? 'sm:grid-cols-[150px_1fr]' : ''"
              >
                <span v-if="forms.length > 1" class="pt-1 text-sm text-muted">{{
                  form.label
                }}</span>
                <span class="text-[20px] leading-snug tracking-tight [overflow-wrap:anywhere]">{{
                  form.value
                }}</span>
              </div>
            </div>
            <div v-else class="flex flex-col gap-3">
              <UTextarea
                v-model="value"
                autofocus
                autoresize
                :rows="2"
                size="xl"
                class="w-full"
                :aria-label="`${languageName(language)} text`"
              />
              <div class="flex flex-wrap gap-2">
                <UButton
                  label="Approve with this change"
                  color="neutral"
                  :disabled="!value.trim()"
                  :loading="approveEdited.isPending.value"
                  @click="approveEdited.mutate()"
                />
                <UButton
                  label="Send for review"
                  color="neutral"
                  variant="outline"
                  :disabled="!value.trim()"
                  :loading="sendEdited.isPending.value"
                  @click="sendEdited.mutate()"
                />
                <UButton label="Cancel" color="neutral" variant="ghost" @click="mode = 'view'" />
              </div>
            </div>
            <p v-if="current.draft && mode !== 'edit' && live" class="mt-4 text-sm text-muted">
              Live now: <GlotTextValue :value="live" />
            </p>
            <p
              v-for="failure in current.draft?.failures ?? []"
              :key="failure.code"
              class="text-sm text-error"
            >
              {{ failure.message }}
            </p>
          </div>
        </section>
        <div v-if="mode === 'comment'" class="flex flex-col gap-2">
          <UTextarea
            v-model="body"
            autofocus
            autoresize
            :rows="2"
            placeholder="Write a comment"
            class="w-full"
            aria-label="Comment"
          />
          <div class="flex flex-wrap gap-2">
            <UButton
              label="Comment"
              color="neutral"
              :disabled="!body.trim()"
              :loading="comment.isPending.value"
              @click="comment.mutate()"
            />
            <UButton
              label="Ask for a change"
              color="neutral"
              variant="outline"
              :disabled="!body.trim()"
              :loading="askChange.isPending.value"
              @click="askChange.mutate()"
            />
            <UButton label="Cancel" color="neutral" variant="ghost" @click="mode = 'view'" />
          </div>
        </div>
        <div
          class="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 bg-default/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:grid-cols-4 sm:bg-transparent sm:p-0"
        >
          <UButton
            label="Skip"
            color="neutral"
            variant="outline"
            size="lg"
            block
            :disabled="!idle()"
            @click="skip"
          >
            <template #trailing><UKbd value="S" /></template>
          </UButton>
          <UButton
            label="Edit"
            color="neutral"
            variant="outline"
            size="lg"
            block
            :disabled="!idle()"
            @click="edit"
          >
            <template #trailing><UKbd value="E" /></template>
          </UButton>
          <UButton
            label="Comment"
            color="neutral"
            variant="outline"
            size="lg"
            block
            :disabled="!idle()"
            @click="startComment"
          >
            <template #trailing><UKbd value="C" /></template>
          </UButton>
          <UButton
            label="Approve"
            color="neutral"
            size="lg"
            block
            :disabled="!idle()"
            :loading="approve.isPending.value"
            @click="approveCurrent"
          >
            <template #trailing><UKbd value="A" /></template>
          </UButton>
        </div>
      </div>
      <aside class="flex min-w-0 flex-col gap-6">
        <section class="flex flex-col gap-2">
          <h2 class="font-semibold text-highlighted">Where it shows</h2>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="app in current.text.shownIn"
              :key="app"
              :label="app"
              color="neutral"
              variant="outline"
            />
          </div>
          <p class="text-sm text-muted">{{ current.text.where }}</p>
        </section>
        <section v-if="hits.length > 0" class="flex flex-col gap-2">
          <h2 class="font-semibold text-highlighted">Glossary</h2>
          <div
            v-for="term in hits"
            :key="term.id"
            class="rounded-control bg-muted px-3 py-2.5 text-sm"
          >
            <p>
              <b class="font-semibold">{{ term.name }}</b>
              <template v-if="term.terms[language]">
                → {{ term.terms[language]?.term }}
                <s
                  v-for="word in term.terms[language]?.avoid ?? []"
                  :key="word"
                  class="ml-2 text-error"
                  >{{ word }}</s
                >
              </template>
            </p>
            <p class="mt-0.5 text-muted">{{ term.definition }}</p>
          </div>
        </section>
        <section v-if="(comments.data.value ?? []).length > 0" class="flex flex-col gap-2">
          <h2 class="font-semibold text-highlighted">Comments</h2>
          <div v-for="item in comments.data.value" :key="item.id" class="flex items-start gap-2.5">
            <UAvatar :alt="item.authorName" size="sm" />
            <p class="text-sm">
              <span class="font-medium">{{ item.authorName }}</span>
              <span v-if="item.kind === 'CHANGE_REQUEST'" class="text-muted">
                asked for a change</span
              >
              <span class="block text-muted">{{ item.body }}</span>
            </p>
          </div>
        </section>
      </aside>
    </div>
    <div v-else-if="queue.isPending.value" class="py-10 text-center text-muted">Loading…</div>
    <div v-else class="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <UIcon name="i-lucide-circle-check-big" class="size-8 text-primary" />
      <p class="text-lg font-semibold text-highlighted">
        {{ done.length > 0 ? `${done.length} reviewed` : 'Nothing to review' }}
      </p>
      <p class="text-muted">{{ languageName(language) }}</p>
      <div class="flex gap-2">
        <UButton
          v-if="remaining.length > 0"
          label="Show the skipped ones"
          color="neutral"
          variant="outline"
          @click="startAgain"
        />
        <UButton
          label="Back to the queue"
          color="neutral"
          :to="{ path: `/projects/${projectId}/review`, query: { language } }"
        />
      </div>
    </div>
  </AppPage>
</template>
