<script setup lang="ts">
import type { Translation } from '@glot/contract'
import GlotStateStrip from '@glot/ui/components/GlotStateStrip.vue'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { SETTINGS_LINKS } from '../constants/people.constants.ts'
import {
  APPEARANCES,
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
  const dark = colorMode.value === 'dark'

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

  const actions = [
    {
      id: 'appearance',
      label: dark ? 'Switch to light' : 'Switch to dark',
      icon: dark ? 'i-lucide-sun' : 'i-lucide-moon',
      run: () => {
        colorMode.preference = dark ? APPEARANCES.LIGHT : APPEARANCES.DARK
      },
    },
    { id: 'invite', label: 'Invite someone', icon: 'i-lucide-user-plus', to: '/settings/people' },
  ]

  return [
    {
      label: `Texts · ${texts.data.value?.items.length ?? 0} of ${texts.data.value?.total ?? 0}`,
      items: (texts.data.value?.items ?? []).map((text) => ({
        id: text.id,
        label: text.source.value,
        sub: `${text.key.source} · ${text.key.path.join('.')}`,
        icon: 'i-lucide-text',
        to: `/projects/${project.value?.id}/texts?text=${text.id}`,
        translations: text.translations,
      })),
    },
    {
      label: 'Go to',
      items: pages.filter((page) => matches(page.label) || Boolean(term.value && 'count' in page)),
    },
    { label: 'Actions', items: actions },
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

    nextTick(() => list.value?.querySelector('.cmdk-i.on')?.scrollIntoView({ block: 'nearest' }))
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
    fullscreen
    :overlay="false"
    :ui="{ content: 'bg-transparent ring-0 shadow-none divide-y-0' }"
    title="Search"
    description="Search texts or jump to a page"
  >
    <template #content>
      <div class="scrim" style="z-index: 60" @click="open = false" />
      <div class="cmdk">
        <div class="cmdk-in">
          <UIcon name="i-lucide-search" /><input
            v-model="term"
            autofocus
            placeholder="Search texts in any language, keys, or jump to…"
            aria-label="Search"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="run(flat[active])"
          /><span v-if="project" class="lc plain scope">{{ project.name }}</span>
        </div>
        <div ref="list" class="cmdk-list">
          <template v-for="group in groups" :key="group.label">
            <div class="cmdk-g">{{ group.label }}</div>
            <div
              v-for="item in group.items"
              :key="item.id"
              :class="{ on: flat.indexOf(item) === active }"
              class="cmdk-i"
              role="option"
              :aria-selected="flat.indexOf(item) === active"
              @mousemove="active = flat.indexOf(item)"
              @click="run(item)"
            >
              <UIcon :name="item.icon" /><span class="cmdk-t"
                ><span
                  >{{ parts(item.label).before }}<mark>{{ parts(item.label).match }}</mark
                  >{{ parts(item.label).after }}</span
                ><span v-if="item.sub" class="key">{{ item.sub }}</span></span
              >
              <span v-if="item.translations || item.count" class="right"
                ><GlotStateStrip v-if="item.translations" :translations="item.translations" /><span
                  v-if="item.count"
                  class="badge-n"
                  >{{ item.count }}</span
                ></span
              >
            </div>
          </template>
          <div
            v-if="flat.length === 0"
            class="cmdk-g"
            style="padding: 24px 10px; text-align: center"
          >
            {{ texts.isFetching.value ? 'Searching…' : `Nothing matches “${term}”.` }}
          </div>
        </div>
        <div class="cmdk-f">
          <span><span class="kbd">↑</span><span class="kbd">↓</span>move</span>
          <span><span class="kbd">↵</span>open</span>
          <span style="margin-left: auto"><span class="kbd">esc</span>close</span>
        </div>
      </div>
    </template>
  </UModal>
</template>
