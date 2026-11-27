<script setup lang="ts">
import { TEXT_STATES } from '@glot/database/constants/texts'
import GlotMark from '@glot/ui/components/GlotMark.vue'
import GlotTextValue from '@glot/ui/components/GlotTextValue.vue'
import { TEXT_STATE_CLASSES } from '@glot/ui/constants'
import { computed, ref, useTemplateRef } from 'vue'
import type { PageRow } from '../types/widget.types.ts'
import GlotIcon from './GlotIcon.vue'
import GlotKey from './GlotKey.vue'

const props = defineProps<{
  rows: PageRow[]
  language: string
  languages: string[]
  selected: string | null
  member: string
  place: string
  glotUrl: string
  unreachable: boolean
}>()

const emit = defineEmits<{ close: []; pick: [row: PageRow]; language: [code: string] }>()

const list = useTemplateRef<HTMLDivElement>('list')
const showReviewed = ref<boolean>(false)

const clickable = computed(() => props.rows.filter((row) => row.clickable))
const fix = computed(() => clickable.value.filter((row) => row.state === TEXT_STATES.NEEDS_FIX))
const check = computed(() => clickable.value.filter((row) => row.state === TEXT_STATES.TO_CHECK))
const missing = computed(() => clickable.value.filter((row) => row.state === TEXT_STATES.MISSING))
const reviewed = computed(() => clickable.value.filter((row) => row.state === TEXT_STATES.REVIEWED))
const hidden = computed(() => props.rows.filter((row) => !row.clickable))

const groups = computed(() =>
  [
    { id: 'fix', label: 'Needs a fix', icon: 'triangle-alert' as const, rows: fix.value },
    { id: 'miss', label: 'Missing', icon: 'circle-dashed' as const, rows: missing.value },
    { id: 'check', label: 'To check', icon: 'eye' as const, rows: check.value },
    {
      id: 'ok',
      label: 'Reviewed',
      icon: 'check' as const,
      rows: showReviewed.value ? reviewed.value : [],
    },
    { id: 'hidden', label: 'Not clickable', icon: 'eye-off' as const, rows: hidden.value },
  ].filter((group) => group.rows.length > 0),
)

const active = ref<string>('fix')

function jump(id: string) {
  active.value = id

  if (id === 'ok') {
    showReviewed.value = true
  }

  requestAnimationFrame(() =>
    list.value?.querySelector(`[data-group="${id}"]`)?.scrollIntoView({ block: 'start' }),
  )
}
</script>

<template>
  <aside class="w-drawer glot-w" data-glot="drawer">
    <div class="w-head">
      <span class="mark"><GlotMark /></span><b>On this page</b>
      <div class="right">
        <div v-if="languages.length <= 4" class="seg seg-sm" data-glot="languages">
          <button
            v-for="code in languages"
            :key="code"
            type="button"
            :class="{ on: code === language }"
            @click="emit('language', code)"
          >
            <span class="mono">{{ code }}</span>
          </button>
        </div>
        <select
          v-else
          class="btn btn-ghost btn-sm mono"
          :value="language"
          data-glot="languages"
          @change="emit('language', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="code in languages" :key="code" :value="code">{{ code }}</option>
        </select>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-icon"
          aria-label="Close"
          @click="emit('close')"
        >
          <GlotIcon name="x" />
        </button>
      </div>
    </div>
    <div class="w-sub">
      <div class="seg seg-sm" data-glot="strip">
        <button type="button" :class="{ on: active === 'fix' }" @click="jump('fix')">
          <i class="swatch bg-fix" />Fix {{ fix.length }}
        </button>
        <button type="button" :class="{ on: active === 'check' }" @click="jump('check')">
          <i class="swatch bg-check" />Check {{ check.length }}
        </button>
        <button type="button" :class="{ on: active === 'ok' }" @click="jump('ok')">
          Reviewed {{ reviewed.length }}
        </button>
      </div>
    </div>
    <div ref="list" class="w-list">
      <div v-if="unreachable" class="w-g">
        <GlotIcon name="triangle-alert" class="ic-13" />Glot cannot be reached
      </div>
      <template v-for="group in groups" :key="group.id">
        <div class="w-g" :data-group="group.id">
          <GlotIcon :name="group.icon" class="ic-13" />{{ group.label }}
        </div>
        <div
          v-for="row in group.rows"
          :key="row.key"
          :class="['w-it', { on: row.key === selected }]"
          role="button"
          tabindex="0"
          data-glot="row"
          :data-key="row.key"
          @click="emit('pick', row)"
          @keydown.enter="emit('pick', row)"
        >
          <span :class="['lc', TEXT_STATE_CLASSES[row.state]]">{{ language }}</span>
          <div>
            <div class="t"><GlotTextValue :value="row.value" /></div>
            <div class="s">
              <GlotKey :value="row.key" /><template v-if="row.reason"> · {{ row.reason }}</template>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div class="w-foot">
      <GlotIcon name="user" class="ic-13" />{{ member }} · {{ place }}
      <a class="btn btn-outline btn-xs" :href="glotUrl" target="_blank" rel="noopener"
        >Open in Glot<GlotIcon name="arrow-up-right"
      /></a>
    </div>
  </aside>
</template>
