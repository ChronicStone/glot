<script setup lang="ts">
import { CHECK_CODES, checkText } from '@glot/checks'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { useForm } from '@tanstack/vue-form'
import { useMutation, useQuery } from '@tanstack/vue-query'
import {
  CHECK_LABELS,
  REVIEW_REASON_LABELS,
  REVIEW_SECONDS_PER_TEXT,
  REVIEW_SESSION_PAGE_SIZE,
  SESSION_OUTCOMES,
} from '../../../../constants/review.constants.ts'

const { $api, $queryClient } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useCurrentProject()
const { approve: approvable } = useRights()
const projectId = computed(() => project.value?.id ?? '')
const language = computed(() => String(route.params.language))
const mode = ref<'view' | 'edit' | 'comment'>('view')
const body = ref<string>('')
const outcomes = ref<Record<string, string>>({})
const started = ref<number>(Date.now())
const now = ref<number>(Date.now())

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
  ...$api.glossary.list.queryOptions({
    input: { projectId: projectId.value, language: language.value },
  }),
  enabled: Boolean(project.value),
}))

type Item = NonNullable<typeof queue.data.value>['items'][number]

function keyOf(item: Item) {
  return `${item.text.id}|${item.draft?.id ?? ''}`
}

const items = computed(() => queue.data.value?.items ?? [])
const waiting = computed(() => items.value.filter((item) => !outcomes.value[keyOf(item)]))

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

const translation = computed(() =>
  current.value?.text.translations.find((item) => item.language === language.value),
)

const proposed = computed(() => current.value?.draft?.value ?? translation.value?.value ?? '')
const rendered = computed(() => pluralForms({ language: language.value, value: proposed.value }))
const failures = computed(() => current.value?.draft?.failures ?? translation.value?.failures ?? [])

const hits = computed(() => {
  const source = current.value?.text.source.value.toLocaleLowerCase() ?? ''

  return (glossary.data.value ?? []).filter(
    (term) =>
      Object.values(term.terms).some((words) => source.includes(words.term.toLocaleLowerCase())) ||
      source.includes(term.name.toLocaleLowerCase()),
  )
})

const counted = computed(() => Object.values(outcomes.value))

const approvedCount = computed(
  () => counted.value.filter((value) => value === SESSION_OUTCOMES.APPROVED).length,
)

const editedCount = computed(
  () => counted.value.filter((value) => value === SESSION_OUTCOMES.EDITED).length,
)

const doneCount = computed(() => approvedCount.value + editedCount.value)

const total = computed(() => doneCount.value + (queue.data.value?.total ?? 0))

const position = computed(() => counted.value.length + 1)

const pace = computed(() =>
  doneCount.value > 0
    ? `${Math.round((now.value - started.value) / 1000 / doneCount.value)} s`
    : '—',
)

const minutesLeft = computed(() =>
  Math.max(1, Math.round((waiting.value.length * REVIEW_SECONDS_PER_TEXT) / 60)),
)

const segments = computed(() =>
  items.value.slice(0, 60).map((item) => {
    const outcome = outcomes.value[keyOf(item)]

    return outcome ?? (item === current.value ? 'cur' : '')
  }),
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

async function leave(options: { outcome: string; message: string }) {
  if (current.value) {
    outcomes.value = { ...outcomes.value, [keyOf(current.value)]: options.outcome }
  }

  focusId.value = undefined
  toast.add({ title: options.message, color: 'success', icon: 'i-lucide-circle-check' })

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
  onSuccess: () => leave({ outcome: SESSION_OUTCOMES.APPROVED, message: 'Approved' }),
  onError: failed,
})

const approveEdited = useMutation({
  mutationFn: (value: string) => $api.reviews.editAndApprove.call({ ...target(), value }),
  onSuccess: () =>
    leave({ outcome: SESSION_OUTCOMES.EDITED, message: 'Approved with your change' }),
  onError: failed,
})

const noForms: string[] = []

const editor = useForm({
  defaultValues: { forms: noForms },
  validators: {
    onChange: ({ value }) =>
      textCheckError({
        source: current.value?.text.source.value ?? '',
        target: value.forms.join(' | '),
      }),
  },
  onSubmit: ({ value }) =>
    approveEdited.mutateAsync(value.forms.join(' | ')).catch(() => undefined),
})

const editInvalid = editor.useSelector(
  (state) => !state.isValid || state.values.forms.some((form) => !form.trim()),
)

const editError = editor.useSelector((state) => errorMessage(state.errors))
const edited = editor.useSelector((state) => state.values.forms.join(' | '))

const shownFailures = computed(() =>
  mode.value === 'edit'
    ? checkText({
        source: current.value?.text.source.value ?? '',
        target: edited.value,
        avoid: hits.value.flatMap((hit) => hit.terms[language.value]?.avoid ?? []),
      })
    : failures.value,
)

const checks = computed(() =>
  Object.values(CHECK_CODES).map((code) => ({
    code,
    failure: shownFailures.value.find((failure) => failure.code === code),
  })),
)

const askChange = useMutation({
  mutationFn: () =>
    $api.reviews.requestChange.call({ ...target(), ...draftId(), body: body.value }),
  onSuccess: () => leave({ outcome: SESSION_OUTCOMES.SKIPPED, message: 'Change requested' }),
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

const approveSame = useMutation({
  mutationFn: () =>
    $api.reviews.approveSame.call({ projectId: projectId.value, language: language.value }),
  onSuccess: async ({ approved }) => {
    toast.add({ title: `${approved} approved`, color: 'success', icon: 'i-lucide-circle-check' })

    await $queryClient.invalidateQueries({ queryKey: $api.reviews.key() })
  },
  onError: failed,
})

const busy = computed(
  () => approve.isPending.value || approveEdited.isPending.value || askChange.isPending.value,
)

function idle() {
  return Boolean(current.value) && mode.value === 'view' && !busy.value
}

function skip() {
  if (current.value && idle()) {
    outcomes.value = { ...outcomes.value, [keyOf(current.value)]: SESSION_OUTCOMES.SKIPPED }
    focusId.value = undefined
  }
}

function edit() {
  if (idle()) {
    editor.reset({ forms: proposed.value.split('|').map((form) => form.trim()) })
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
  outcomes.value = Object.fromEntries(
    Object.entries(outcomes.value).filter(([, outcome]) => outcome !== SESSION_OUTCOMES.SKIPPED),
  )
}

useIntervalFn(() => {
  now.value = Date.now()
}, 5000)

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
  <AppPage :title="`Review · ${languageName(language)}`" class="rv-head" scroll>
    <template #mobile>
      <NuxtLink
        :to="`/projects/${projectId}/texts`"
        class="btn btn-ghost btn-icon btn-sm"
        aria-label="End session"
        ><UIcon name="i-lucide-x"
      /></NuxtLink>
      <span class="g-grow" /><span class="pill check"
        ><UIcon name="i-lucide-eye" />{{ waiting.length }} to check</span
      >
    </template>
    <template #crumb>{{ project?.name }}<UIcon name="i-lucide-chevron-right" />Review</template>
    <template #pill>
      <span class="pill check pill-lg"
        ><UIcon name="i-lucide-eye" />{{ waiting.length.toLocaleString('en-US') }} to check</span
      >
    </template>
    <template #meta>
      <span><UIcon name="i-lucide-list" />Every {{ languageName(language) }} text to check</span>
      <span><UIcon name="i-lucide-user-check" />You review {{ languageName(language) }}</span>
    </template>
    <template #actions>
      <div v-if="approvable.length > 1" class="seg">
        <NuxtLink
          v-for="code in approvable"
          :key="code"
          :to="`/projects/${projectId}/review/${code}`"
          :class="{ on: code === language }"
          ><span class="lc plain">{{ code }}</span>{{ languageName(code) }}</NuxtLink
        >
      </div>
      <button
        v-if="(queue.data.value?.sameElsewhere ?? 0) > 0"
        type="button"
        class="btn btn-outline"
        :class="{ 'is-loading': approveSame.isPending.value }"
        @click="approveSame.mutate()"
      >
        Approve {{ queue.data.value?.sameElsewhere }} identical
      </button>
      <NuxtLink :to="`/projects/${projectId}/texts`" class="btn btn-outline">End session</NuxtLink>
    </template>

    <div class="rv-band">
      <div class="stats">
        <div class="stat">
          <div class="l">Done</div>
          <div class="v">{{ doneCount }}<small>of {{ total.toLocaleString('en-US') }}</small></div>
        </div>
        <div class="stat">
          <div class="l">Approved</div>
          <div class="v">{{ approvedCount }}</div>
        </div>
        <div class="stat">
          <div class="l">Edited</div>
          <div class="v">{{ editedCount }}</div>
        </div>
        <div class="stat">
          <div class="l">Pace</div>
          <div class="v">{{ pace }}</div>
        </div>
        <div class="stat">
          <div class="l">Left</div>
          <div class="v">~{{ minutesLeft }} min</div>
        </div>
      </div>
      <div>
        <div class="sess">
          <i v-for="(segment, index) in segments" :key="index" :class="segment" />
        </div>
      </div>
      <div class="m-prog">
        <span class="num">{{ position }} / {{ total }}</span>
        <div class="sess">
          <i v-for="(segment, index) in segments" :key="index" :class="segment" />
        </div>
        <span>~{{ minutesLeft }} min</span>
      </div>
    </div>

    <div v-if="queue.isPending.value" class="rv">
      <section class="panel rv-main">
        <div class="rv-card"><div class="sk" style="height: 180px; border-radius: 16px" /></div>
      </section>
    </div>

    <div v-else-if="!current" class="rv-done">
      <div class="rv-done-in">
        <span class="big"><UIcon name="i-lucide-check" /></span>
        <h2>{{ languageName(language) }} is checked</h2>
        <p>Approved texts ship with the next release.</p>
        <div class="stats">
          <div class="stat">
            <div class="l">Approved</div>
            <div class="v">{{ approvedCount }}</div>
          </div>
          <div class="stat">
            <div class="l">Edited</div>
            <div class="v">{{ editedCount }}</div>
          </div>
          <div class="stat">
            <div class="l">Pace</div>
            <div class="v">{{ pace }}</div>
          </div>
        </div>
        <div v-if="items.length > 0" class="row-flex">
          <button type="button" class="btn btn-outline" @click="startAgain">
            <UIcon name="i-lucide-rotate-ccw" />Back to the skipped texts
          </button>
        </div>
      </div>
    </div>

    <div v-else class="rv">
      <section class="panel rv-main">
        <div class="rv-card">
          <div class="rv-why">
            <UIcon :name="current.draft ? 'i-lucide-pencil-line' : 'i-lucide-eye'" /><span>{{
              reason
            }}</span
            ><span class="right">{{ position }} of {{ total }}</span>
          </div>
          <div class="rv-lbl">
            <span class="key">{{ current.text.key.path.join('.') }}</span
            ><span class="faint">·</span>{{ current.text.key.source }}<span class="faint">·</span
            >{{ languageName(current.text.source.language) }}
          </div>
          <div class="rv-fr">
            <GlotTextValue :value="current.text.source.value" :syntax="current.text.syntax" />
          </div>
          <div class="rv-lbl">
            {{ languageName(language) }} · rendered with the app’s plural rules
          </div>
          <div class="forms">
            <div
              v-for="(form, index) in rendered"
              :key="index"
              :class="{ editing: mode === 'edit' }"
              class="f"
            >
              <div class="n"><b>{{ form.name }}</b>{{ form.label }}</div>
              <div class="v">
                <editor.Field v-if="mode === 'edit'" v-slot="{ field }" :name="`forms[${index}]`">
                  <label
                    :class="{ 'is-error': editError }"
                    class="input input-lg is-focus"
                    style="font-size: 18px"
                    ><input
                      :value="field.state.value"
                      :aria-label="form.name"
                      :aria-invalid="Boolean(editError)"
                      autofocus
                      @input="field.handleChange(inputValue($event))"
                      @keydown.enter.prevent="editor.handleSubmit()"
                  /></label>
                </editor.Field>
                <GlotTextValue v-else :value="form.value" :syntax="current.text.syntax" />
              </div>
              <div class="pill-slot" />
            </div>
          </div>
          <p v-if="mode === 'edit' && editError" class="hint err" role="alert">{{ editError }}</p>
          <div class="checks-row">
            <span
              v-for="check in checks"
              :key="check.code"
              :class="{ bad: check.failure }"
              class="pill"
              :title="check.failure?.message"
              ><UIcon :name="check.failure ? 'i-lucide-triangle-alert' : 'i-lucide-check'" />{{
                check.failure && mode !== 'edit' ? check.failure.message : CHECK_LABELS[check.code]
              }}</span
            >
          </div>
          <div v-if="mode === 'comment'" class="editor" style="margin-top: 14px">
            <label class="input textarea is-focus">
              <textarea
                v-model="body"
                rows="2"
                autofocus
                placeholder="What should change, or a note"
                aria-label="Comment"
              />
            </label>
          </div>
          <div class="m-rail">
            <button type="button">
              <UIcon name="i-lucide-app-window" /><span
                ><b>Where it shows</b> · {{ current.text.shownIn.join(', ') }}</span
              ><UIcon name="i-lucide-chevron-right" />
            </button>
            <button v-if="hits.length > 0" type="button">
              <UIcon name="i-lucide-book-open-text" /><span
                ><b>Glossary</b> ·
                {{ hits.map((hit) => hit.terms[language]?.term ?? hit.name).join(', ') }}</span
              ><UIcon name="i-lucide-chevron-right" />
            </button>
          </div>
          <div v-if="mode === 'edit'" class="rv-acts">
            <button type="button" class="btn btn-outline" @click="mode = 'view'">
              Cancel<span class="kbd">esc</span>
            </button>
            <span />
            <span />
            <button
              type="button"
              class="btn btn-primary"
              :class="{ 'is-loading': approveEdited.isPending.value }"
              :disabled="editInvalid"
              @click="editor.handleSubmit()"
            >
              <UIcon name="i-lucide-check" />Approve with change
            </button>
          </div>
          <div v-else-if="mode === 'comment'" class="rv-acts">
            <button type="button" class="btn btn-outline" @click="mode = 'view'">
              Cancel<span class="kbd">esc</span>
            </button>
            <span />
            <button
              type="button"
              class="btn btn-outline"
              :disabled="!body.trim()"
              :class="{ 'is-loading': comment.isPending.value }"
              @click="comment.mutate()"
            >
              Comment
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!body.trim()"
              :class="{ 'is-loading': askChange.isPending.value }"
              @click="askChange.mutate()"
            >
              Ask for a change
            </button>
          </div>
          <div v-else class="rv-acts">
            <button type="button" class="btn btn-outline" @click="skip">
              <UIcon name="i-lucide-skip-forward" />Skip<span class="kbd">S</span>
            </button>
            <button type="button" class="btn btn-outline" @click="edit">
              <UIcon name="i-lucide-pencil" />Edit<span class="kbd">E</span>
            </button>
            <button type="button" class="btn btn-outline" @click="startComment">
              <UIcon name="i-lucide-message-circle" />Comment<span class="kbd">C</span>
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :class="{ 'is-loading': approve.isPending.value }"
              @click="approveCurrent"
            >
              <UIcon name="i-lucide-check" />Approve<span class="kbd">A</span>
            </button>
          </div>
        </div>
      </section>
      <aside class="panel rv-rail">
        <section>
          <h4>Where it shows<span class="meta">{{ current.text.key.source }}</span></h4>
          <div class="rows">
            <div v-for="app in current.text.shownIn" :key="app" class="r" style="padding: 9px 0">
              <UIcon name="i-lucide-app-window" class="muted" /><span class="g-grow">{{
                app
              }}</span>
            </div>
          </div>
        </section>
        <section>
          <h4>Glossary<span class="meta">{{ hits.length }} terms</span></h4>
          <div class="gl">
            <div v-for="hit in hits" :key="hit.id" class="g">
              <div class="t">
                {{ hit.name }}<UIcon name="i-lucide-arrow-right" />{{
                  hit.terms[language]?.term ?? hit.name
                }}<s v-for="word in hit.terms[language]?.avoid ?? []" :key="word">{{ word }}</s>
              </div>
              <div class="d">{{ hit.definition }}</div>
            </div>
            <p v-if="hits.length === 0" class="muted" style="font-size: 13px">
              No glossary term in this text.
            </p>
          </div>
        </section>
        <section>
          <h4>Comments<span class="meta">{{ comments.data.value?.length ?? 0 }}</span></h4>
          <div
            v-for="item in comments.data.value ?? []"
            :key="item.id"
            class="cmt"
            style="margin-bottom: 10px"
          >
            <AppAvatar :name="item.authorName" size="sm" />
            <div>
              <b>{{ item.authorName }}</b>&nbsp;<span class="when">{{
                item.kind === 'CHANGE_REQUEST' ? 'asks for a change' : ''
              }}</span
              ><br />{{ item.body }}
            </div>
          </div>
        </section>
      </aside>
    </div>
  </AppPage>
</template>
