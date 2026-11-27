<script setup lang="ts">
import type { AiUsageView } from '@glot/contract'
import { AI_BUDGET, AI_USAGE_KIND_COLORS, AI_USAGE_KIND_LABELS } from '../constants/ai.constants.ts'

const { usage } = defineProps<{ usage: AiUsageView }>()

const money = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' })
const count = new Intl.NumberFormat('en')
const dayLabel = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })

const ratio = computed(() => (usage.budgetUsd > 0 ? usage.spentUsd / usage.budgetUsd : 0))

const daysInMonth = computed(() => {
  const [year = 0, month = 1] = usage.month.split('-').map(Number)

  return new Date(Date.UTC(year, month, 0)).getUTCDate()
})

const pace = computed(() => usage.budgetUsd / daysInMonth.value)
const highest = computed(() => Math.max(pace.value, ...usage.days.map(({ costUsd }) => costUsd)))

const bars = computed(() =>
  usage.days.map((day, index) => ({
    ...day,
    height: highest.value > 0 ? `${(day.costUsd / highest.value) * 100}%` : '0%',
    today: index === usage.days.length - 1,
    title: `${dayLabel.format(new Date(`${day.date}T00:00:00Z`))}: ${money.format(day.costUsd)} · ${count.format(day.texts)} texts`,
  })),
)

const axis = computed(() => {
  const first = usage.days[0]
  const middle = usage.days[Math.floor(usage.days.length / 2)]

  return [first, middle].flatMap((day) =>
    day ? [dayLabel.format(new Date(`${day.date}T00:00:00Z`))] : [],
  )
})

const kinds = computed(() => {
  const total = usage.kinds.reduce((sum, kind) => sum + kind.costUsd, 0)

  return usage.kinds.map((kind) => ({
    ...kind,
    label: AI_USAGE_KIND_LABELS[kind.kind],
    color: AI_USAGE_KIND_COLORS[kind.kind],
    share: total > 0 ? Math.round((kind.costUsd / total) * 100) : 0,
  }))
})

const textsBy = computed(() =>
  Object.fromEntries(usage.kinds.map((kind) => [kind.kind, kind.texts])),
)
</script>

<template>
  <section class="panel panel-pad">
    <div class="row-flex">
      <span class="h3">This month</span>
      <span class="grow" />
      <span :class="ratio >= AI_BUDGET.WARN_RATIO ? 'warn' : 'plain'" class="pill"
        ><UIcon name="i-lucide-wallet" />{{ money.format(usage.spentUsd) }} of
        {{ money.format(usage.budgetUsd) }}</span
      >
    </div>
    <div v-if="ratio >= AI_BUDGET.ALERT_RATIO" class="banner warn" style="margin-top: 14px">
      <UIcon name="i-lucide-triangle-alert" /><span
        ><b>{{ Math.min(Math.round(ratio * 100), 100) }}% of the budget is used.</b> At 100% AI
        fills pause; writing and reviews go on.</span
      >
    </div>
    <div class="stats" style="margin-top: 18px">
      <div class="stat">
        <div class="l">Texts filled</div>
        <div class="v">{{ count.format(textsBy.FILL ?? 0) }}</div>
      </div>
      <div class="stat">
        <div class="l">Suggestions</div>
        <div class="v">{{ count.format(textsBy.SUGGEST ?? 0) }}</div>
      </div>
      <div class="stat">
        <div class="l">Calls</div>
        <div class="v">{{ count.format(usage.calls) }}</div>
      </div>
    </div>
    <div style="margin-top: 22px">
      <div class="bars" role="img" :aria-label="`Daily AI spend for ${usage.month}`">
        <i
          v-for="bar in bars"
          :key="bar.date"
          :class="{ today: bar.today }"
          :style="{ height: bar.height }"
          :title="bar.title"
        />
        <span
          v-if="usage.budgetUsd > 0"
          class="cap"
          :style="{ bottom: `${(pace / highest) * 100}%` }"
          ><span>Daily pace for {{ money.format(usage.budgetUsd) }}</span></span
        >
      </div>
      <div class="bars-x">
        <span v-for="label in axis" :key="label">{{ label }}</span><span>Today</span>
      </div>
    </div>
    <template v-if="usage.spentUsd > 0">
      <div class="sbar" style="margin-top: 18px; height: 10px">
        <i
          v-for="kind in kinds"
          :key="kind.kind"
          :style="{ flex: kind.share, background: kind.color }"
        />
      </div>
      <div class="legend" style="margin-top: 10px; font-size: 12px">
        <span v-for="kind in kinds" :key="kind.kind"
          ><i class="swatch" :style="{ background: kind.color }" />{{ kind.label }}
          <b>{{ kind.share }}%</b></span
        >
      </div>
    </template>
    <p v-else class="muted" style="margin: 16px 0 0; font-size: 13px">
      No AI this month yet. Suggestions and fills show here as they run.
    </p>
  </section>
</template>
