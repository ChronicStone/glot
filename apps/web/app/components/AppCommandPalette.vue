<script setup lang="ts">
import type { Translation } from '@glot/contract'
import GlotStateStrip from '@glot/ui/components/GlotStateStrip.vue'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { SETTINGS_LINKS } from '../constants/people.constants.ts'
import {
  APPEARANCES,
  APPEARANCE_ICONS,
  APPEARANCE_LABELS,
  PROJECT_SECTIONS,
  PROJECT_SECTION_ICONS,
  PROJECT_SECTION_LABELS,
} from '../constants/shell.constants.ts'

const open = defineModel<boolean>('open', { default: false })

const { $api } = useNuxtApp()
const { project } = useCurrentProject()
const reviewTotal = useReviewTotal()
const colorMode = useColorMode()
const term = ref<string>('')
const query = refDebounced(term, 200)
const active = ref<number>(0)
const list = useTemplateRef<HTMLElement>('list')

const texts = useQuery(() => ({
  ...$api.texts.search.queryOptions({
    input: { projectId: project.value?.id ?? '', q: query.value, limit: 5 },
  }),
  enabled: Boolean(project.value && query.value.trim().length > 1),
}))

function matches(label: string) {
  return label.toLowerCase().includes(term.value.trim().toLowerCase())
}

const groups = computed<
  {
    label: string
    items: {
      id: string
      label: string
      icon: string
      sub?: string
      to?: string
      run?: () => void
      count?: number
      translations?: Translation[]
    }[]
  }[]
>(() => {
  const pages = [
    { id: 'home', label: 'Home', icon: 'i-lucide-house', to: '/' },
    { id: 'glossary', label: 'Glossary', icon: 'i-lucide-book-open-text', to: '/glossary' },
    ...Object.values(PROJECT_SECTIONS).map((section) => ({
      id: section,
      label: PROJECT_SECTION_LABELS[section],
      icon: PROJECT_SECTION_ICONS[section],
      to: `/projects/${project.value?.id}/${section}`,
      ...(section === PROJECT_SECTIONS.REVIEW && reviewTotal.value > 0
        ? { count: reviewTotal.value }
        : {}),
    })),
    ...Object.values(SETTINGS_LINKS).map((link) => ({ id: link.to, ...link })),
  ]

  const appearances = Object.values(APPEARANCES).map((appearance) => ({
    id: appearance,
    label: `${APPEARANCE_LABELS[appearance]} appearance`,
    icon: APPEARANCE_ICONS[appearance],
    run: () => {
      colorMode.preference = appearance
    },
  }))

  return [
    {
      label: `Texts · ${texts.data.value?.items.length ?? 0} of ${texts.data.value?.total ?? 0}`,
      items: (texts.data.value?.items ?? []).map((text) => ({
        id: text.id,
        label: text.source.value,
        sub: text.where,
        icon: 'i-lucide-text',
        to: `/projects/${project.value?.id}/texts?text=${text.id}`,
        translations: text.translations,
      })),
    },
    { label: 'Go to', items: pages.filter(({ label }) => matches(label)) },
    { label: 'Appearance', items: appearances.filter(({ label }) => matches(label)) },
  ].filter(({ items }) => items.length > 0)
})

const flat = computed(() => groups.value.flatMap(({ items }) => items))

function parts(label: string) {
  const at = label.toLowerCase().indexOf(term.value.trim().toLowerCase())
  const size = term.value.trim().length

  return at < 0 || size === 0
    ? { before: label, match: '', after: '' }
    : {
        before: label.slice(0, at),
        match: label.slice(at, at + size),
        after: label.slice(at + size),
      }
}

async function run(item: { to?: string; run?: () => void } | undefined) {
  if (!item) {
    return
  }

  open.value = false
  item.run?.()

  if (item.to) {
    await navigateTo(item.to)
  }
}

function move(offset: number) {
  const count = flat.value.length

  if (count > 0) {
    active.value = (active.value + offset + count) % count
    nextTick(() =>
      list.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }),
    )
  }
}

watch(term, () => {
  active.value = 0
})

watch(open, (value) => {
  if (value) {
    term.value = ''
    active.value = 0
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{
      overlay: 'bg-scrim backdrop-blur-[2px]',
      content:
        'top-[13vh] w-[min(660px,calc(100vw-32px))] max-w-none translate-y-0 divide-y-0 overflow-hidden rounded-[22px] bg-panel shadow-dialog ring-1 ring-line sm:max-w-none dark:bg-[#18181a] dark:ring-[#2c2c2f]',
    }"
    title="Search"
    description="Search texts or jump to a page"
  >
    <template #content>
      <div class="flex h-[58px] items-center gap-3 border-b border-line px-[18px]">
        <UIcon name="i-lucide-search" class="size-[19px] shrink-0 text-ink-3" />
        <input
          v-model="term"
          autofocus
          class="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-4"
          placeholder="Search texts in any language, or jump to…"
          aria-label="Search"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="run(flat[active])"
        />
        <span
          v-if="project"
          class="inline-flex h-[22px] items-center rounded-[7px] bg-sunken px-1.5 font-mono text-xs text-ink-2 ring-1 ring-line ring-inset"
          >{{ project.name }}</span
        >
      </div>
      <div ref="list" class="max-h-[440px] overflow-auto p-2">
        <template v-for="group in groups" :key="group.label">
          <div class="px-2.5 pt-2.5 pb-1.5 text-xs font-medium text-ink-3">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            :data-active="flat.indexOf(item) === active"
            class="group flex h-11 w-full items-center gap-3 rounded-[11px] px-2.5 text-left text-sm text-ink-2 data-[active=true]:bg-sel data-[active=true]:text-ink data-[active=true]:ring-1 data-[active=true]:ring-sel-ring data-[active=true]:ring-inset"
            @mousemove="active = flat.indexOf(item)"
            @click="run(item)"
          >
            <UIcon
              :name="item.icon"
              class="size-4 shrink-0 text-ink-3 group-data-[active=true]:text-sel-ink"
            />
            <span class="min-w-0 truncate"
              >{{ parts(item.label).before
              }}<b class="font-semibold text-ink">{{ parts(item.label).match }}</b
              >{{ parts(item.label).after }}</span
            >
            <span v-if="item.sub" class="shrink-0 text-xs text-ink-3">{{ item.sub }}</span>
            <span class="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-ink-3">
              <span
                v-if="item.translations"
                class="rounded-[10px] bg-sunken p-[3px] ring-1 ring-line ring-inset"
              >
                <GlotStateStrip :translations="item.translations" />
              </span>
              <span
                v-if="item.count"
                class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-check-bg px-1.5 text-[11.5px] font-semibold text-check tabular-nums"
                >{{ item.count }}</span
              >
            </span>
          </button>
        </template>
        <p v-if="flat.length === 0" class="px-2.5 py-8 text-center text-[13px] text-ink-3">
          {{ texts.isFetching.value ? 'Searching…' : `Nothing matches “${term}”.` }}
        </p>
      </div>
      <div
        class="flex h-[42px] items-center gap-4 border-t border-line bg-panel-2 px-4 text-xs text-ink-3 dark:bg-[#151517]"
      >
        <span class="flex items-center gap-1.5"><UKbd value="↑" /><UKbd value="↓" />move</span>
        <span class="flex items-center gap-1.5"><UKbd value="↵" />open</span>
        <span class="ml-auto flex items-center gap-1.5"><UKbd value="esc" />close</span>
      </div>
    </template>
  </UModal>
</template>
