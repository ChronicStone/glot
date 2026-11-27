<script setup lang="ts">
import { TEMPLATE_KINDS } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import {
  PREVIEW_DEVICES,
  PREVIEW_TYPING_DELAY_MS,
  PREVIEW_WIDTHS,
  TEMPLATE_ERROR_CODES,
  TEMPLATE_ICONS,
  TEMPLATE_KIND_LABELS,
} from '../../../constants/emails.constants.ts'

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { project } = useCurrentProject()
const projectId = computed(() => project.value?.id ?? '')
const brand = ref<string | undefined>()
const language = ref<string | undefined>()
const device = ref<string>(PREVIEW_DEVICES.DESKTOP)
const selectedId = ref<string | undefined>()
const typing = ref<{ textId: string; value: string } | undefined>()
const typed = refDebounced(typing, PREVIEW_TYPING_DELAY_MS)

const list = useQuery(() => ({
  ...$api.templates.list.queryOptions({ input: { projectId: projectId.value } }),
  enabled: Boolean(project.value),
  retry: false,
}))

const listError = computed(() => errorCode(list.error.value))
const templates = computed(() => list.data.value?.templates ?? [])
const brands = computed(() => list.data.value?.brands ?? [])

const template = computed(
  () => templates.value.find(({ id }) => id === route.query.template) ?? templates.value[0],
)

const currentBrand = computed(() => brand.value ?? brands.value[0]?.id ?? '')
const languages = computed(() => project.value?.languages ?? [])
const currentLanguage = computed(() => language.value ?? project.value?.sourceLanguage ?? '')
const groups = computed(() => Map.groupBy(templates.value, ({ group }) => group))

const counts = computed(() =>
  Object.values(TEMPLATE_KINDS).flatMap((kind) => {
    const count = templates.value.filter((entry) => entry.kind === kind).length

    return count === 0 ? [] : [`${count} ${TEMPLATE_KIND_LABELS[kind][count === 1 ? 0 : 1]}`]
  }),
)

const pending = computed(
  () => templates.value.filter(({ state }) => state !== TEXT_STATES.REVIEWED).length,
)

const missingIds = computed(() =>
  currentLanguage.value === project.value?.sourceLanguage
    ? []
    : items.value.filter((text) => stateOf(text.id) === TEXT_STATES.MISSING).map(({ id }) => id),
)

const ref_ = computed(() => ({
  projectId: projectId.value,
  templateId: template.value?.id ?? '',
  brand: currentBrand.value,
}))

const texts = useQuery(() => ({
  ...$api.templates.texts.queryOptions({ input: ref_.value }),
  enabled: Boolean(template.value && currentBrand.value),
  placeholderData: keepPreviousData,
}))

const items = computed(() => texts.data.value?.items ?? [])

const preview = useQuery(() => ({
  ...$api.templates.preview.queryOptions({
    input: {
      ...ref_.value,
      language: currentLanguage.value,
      overrides: typed.value ? [typed.value] : [],
    },
  }),
  enabled: Boolean(template.value && currentBrand.value && list.data.value?.available),
  placeholderData: keepPreviousData,
  retry: false,
}))

const previewDown = computed(
  () =>
    list.data.value?.available === false ||
    errorCode(preview.error.value) === TEMPLATE_ERROR_CODES.ADAPTER_DOWN,
)

const sendTest = useMutation(
  $api.templates.sendTest.mutationOptions({
    onSuccess: ({ to }) =>
      toast.add({ title: `Sent to ${to}`, icon: 'i-lucide-send', color: 'success' }),
    onError: (error) =>
      toast.add({ title: error.message, icon: 'i-lucide-circle-alert', color: 'error' }),
  }),
)

function stateOf(textId: string) {
  return items.value
    .find(({ id }) => id === textId)
    ?.translations.find((translation) => translation.language === currentLanguage.value)?.state
}

function valueOf(textId: string) {
  const text = items.value.find(({ id }) => id === textId)

  return (
    text?.translations.find((translation) => translation.language === currentLanguage.value)
      ?.value ??
    text?.source.value ??
    ''
  )
}

async function open(templateId: string) {
  selectedId.value = undefined
  typing.value = undefined
  await router.replace({ query: { ...route.query, template: templateId } })
}

function select(textId: string) {
  typing.value = undefined
  selectedId.value = textId
}

async function retry() {
  await Promise.all([list.refetch(), preview.refetch()])
}

watch(
  () => template.value?.id,
  async () => {
    await nextTick()
    document.querySelector('.em-i.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { flush: 'post' },
)

watch(currentLanguage, () => {
  typing.value = undefined
})
</script>

<template>
  <AppPage title="Emails & documents">
    <template #pill>
      <span v-if="previewDown" class="pill warn pill-lg"
        ><UIcon name="i-lucide-cloud-off" />Preview down</span
      >
      <span v-else-if="pending > 0" class="pill check pill-lg"
        ><UIcon name="i-lucide-eye" />{{ pending }} to check</span
      >
    </template>
    <template v-if="list.data.value" #meta>
      <span><UIcon name="i-lucide-mail" />{{ counts.join(' · ') }}</span>
      <span
        ><UIcon name="i-lucide-building-2" />{{ brands.length }}
        {{ brands.length === 1 ? 'brand' : 'brands' }}</span
      >
      <span><UIcon name="i-lucide-flask-conical" />Previews use the adapter’s sample data</span>
    </template>

    <div v-if="listError === TEMPLATE_ERROR_CODES.NO_ADAPTER" class="panel em-empty">
      <div class="empty">
        <span class="ico-tile"><UIcon name="i-lucide-mail" /></span>
        <div class="h3">No preview adapter yet</div>
        <p>
          Emails, documents and SMS appear here once a developer sets the project’s preview adapter
          address.
        </p>
        <div class="row-flex">
          <NuxtLink to="/settings/projects" class="btn btn-outline btn-sm"
            ><UIcon name="i-lucide-settings" />Open project settings</NuxtLink
          >
        </div>
      </div>
    </div>

    <div v-else-if="list.isError.value" class="panel em-empty">
      <div class="empty">
        <span class="ico-tile warn"><UIcon name="i-lucide-cloud-off" /></span>
        <div class="h3">Preview unavailable</div>
        <p>The preview adapter is not answering. Try again in a moment.</p>
        <div class="row-flex">
          <button type="button" class="btn btn-outline btn-sm" @click="retry">
            <UIcon name="i-lucide-rotate-cw" />Try again
          </button>
        </div>
      </div>
    </div>

    <div v-else class="em">
      <aside class="panel">
        <div class="em-list">
          <template v-if="list.isPending.value">
            <div v-for="line in 6" :key="line" class="em-i">
              <span class="sk" style="height: 12px; width: 70%" />
            </div>
          </template>
          <template v-for="[group, entries] in groups" :key="group">
            <div class="em-g">{{ group }}</div>
            <button
              v-for="entry in entries"
              :key="entry.id"
              type="button"
              :class="{ on: entry.id === template?.id }"
              class="em-i"
              @click="open(entry.id)"
            >
              <UIcon :name="TEMPLATE_ICONS[entry.kind]" />{{ entry.name
              }}<i :class="`bg-${TEXT_STATE_CLASSES[entry.state]}`" class="dot" />
            </button>
          </template>
        </div>
      </aside>

      <section class="panel">
        <div class="em-tools">
          <AppSegmented
            v-if="brands.length > 1"
            :model-value="currentBrand"
            :items="brands.map(({ id, name }) => ({ label: name, value: id }))"
            small
            @update:model-value="brand = $event"
          />
          <AppSegmented
            :model-value="currentLanguage"
            :items="languages.map((code) => ({ label: code, value: code }))"
            small
            class="mono em-langs"
            @update:model-value="language = $event"
          />
          <AppSegmented
            v-if="template?.kind !== 'sms'"
            v-model="device"
            class="em-device"
            :items="[
              { label: 'Desktop', value: PREVIEW_DEVICES.DESKTOP, icon: 'i-lucide-monitor' },
              { label: 'Phone', value: PREVIEW_DEVICES.PHONE, icon: 'i-lucide-smartphone' },
            ]"
            small
          />
          <div class="right">
            <button
              v-if="list.data.value?.sendTest && template"
              type="button"
              class="btn btn-outline btn-sm"
              :class="{ 'is-loading': sendTest.isPending.value }"
              :disabled="previewDown"
              @click="sendTest.mutate({ ...ref_, language: currentLanguage })"
            >
              <UIcon name="i-lucide-send" />Send a test
            </button>
          </div>
        </div>
        <div v-if="previewDown" class="em-canvas em-center">
          <div class="empty">
            <span class="ico-tile warn"><UIcon name="i-lucide-cloud-off" /></span>
            <div class="h3">Preview unavailable</div>
            <p>
              The preview adapter is not answering. You can still edit the texts on the right; the
              preview comes back on its own.
            </p>
            <div class="row-flex">
              <button type="button" class="btn btn-outline btn-sm" @click="retry">
                <UIcon name="i-lucide-rotate-cw" />Try again
              </button>
            </div>
          </div>
        </div>
        <div v-else-if="preview.data.value?.kind === 'sms'" class="em-canvas em-center em-top">
          <SmsBubble :text="preview.data.value.text ?? ''" :from="preview.data.value.from" />
        </div>
        <div v-else-if="preview.data.value?.html" class="em-canvas">
          <div
            class="mail"
            :style="{
              width: `${PREVIEW_WIDTHS[device === PREVIEW_DEVICES.PHONE ? 'phone' : 'desktop']}px`,
            }"
          >
            <div v-if="preview.data.value.subject || preview.data.value.from" class="mail-meta">
              <template v-if="preview.data.value.subject"
                ><span>Subject</span
                ><b
                  :class="{ on: selectedId === items[0]?.id }"
                  class="sent"
                  role="button"
                  @click="items[0] && select(items[0].id)"
                  >{{ preview.data.value.subject }}</b
                ></template
              >
              <template v-if="preview.data.value.from"
                ><span>From</span><span>{{ preview.data.value.from }}</span></template
              >
            </div>
            <EmailFrame
              :html="preview.data.value.html"
              :selected-id="selectedId"
              :missing-ids="missingIds"
              :width="PREVIEW_WIDTHS[device === PREVIEW_DEVICES.PHONE ? 'phone' : 'desktop']"
              @select="select"
            />
          </div>
        </div>
        <div v-else class="em-canvas"><div class="mail sk" style="height: 420px" /></div>
      </section>

      <aside class="panel">
        <div class="panel-h" style="padding-bottom: 12px">
          <h3>{{ template?.kind === 'sms' ? template.name : 'Texts in this email' }}</h3>
          <span class="meta">{{ items.length }} {{ items.length === 1 ? 'text' : 'texts' }}</span>
        </div>
        <div class="em-texts">
          <template v-for="(text, index) in items" :key="text.id">
            <EmailTextEditor
              v-if="text.id === selectedId && currentLanguage !== text.source.language"
              :text="text"
              :language="currentLanguage"
              :number="index + 1"
              :sms="
                preview.data.value?.kind === 'sms' ? (preview.data.value.text ?? '') : undefined
              "
              @typing="typing = { textId: text.id, value: $event }"
              @close="select('')"
            />
            <button
              v-else
              type="button"
              :class="{ on: text.id === selectedId }"
              class="et"
              @click="select(text.id)"
            >
              <span class="n">{{ index + 1 }}</span>
              <span v-if="missingIds.includes(text.id)" class="et-missing"
                ><span class="row-flex"
                  ><span class="lc miss">{{ currentLanguage }}</span
                  ><AppStatePill :state="TEXT_STATES.MISSING" /></span
                ><GlotTextValue
                  :value="text.source.value"
                  :syntax="text.syntax"
                  class="muted" /><AppTextKey
                  :source="text.key.source"
                  :path="text.key.path.join('.')"
              /></span>
              <template v-else
                ><span class="et-v"
                  ><GlotTextValue :value="valueOf(text.id)" :syntax="text.syntax" /><AppTextKey
                    :source="text.key.source"
                    :path="text.key.path.join('.')" /></span
                ><i
                  v-if="stateOf(text.id)"
                  :class="`bg-${TEXT_STATE_CLASSES[stateOf(text.id) ?? TEXT_STATES.MISSING]}`"
                  class="dot"
              /></template>
            </button>
          </template>
        </div>
      </aside>
    </div>
  </AppPage>
</template>
