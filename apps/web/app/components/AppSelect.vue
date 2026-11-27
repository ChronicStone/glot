<script setup lang="ts">
const model = defineModel<string>({ required: true })

const { groups, button, wide } = defineProps<{
  groups: {
    label?: string
    meta?: string
    options: {
      value: string
      label: string
      native?: string
      description?: string
      code?: string
      tone?: string
      icon?: string
      iconTone?: string
      context?: string
      contextLabel?: string
      bars?: Record<string, number>
      disabled?: boolean
    }[]
  }[]
  placeholder?: string
  search?: string
  button?: boolean
  icon?: string
  wide?: boolean
  footer?: boolean
}>()

const items = computed(() =>
  groups.map((group, index) => [
    ...(group.label
      ? [
          {
            type: 'label' as const,
            value: `group-${index}`,
            native: '',
            code: '',
            description: '',
            disabled: true,
            label: group.meta ? `${group.label} · ${group.meta}` : group.label,
          },
        ]
      : []),
    ...group.options.map(({ value, label, native, code, description, disabled }) => ({
      value,
      label,
      native: native ?? '',
      code: code ?? '',
      description: description ?? '',
      disabled: disabled ?? false,
    })),
  ]),
)

const byValue = computed(
  () => new Map(groups.flatMap(({ options }) => options).map((option) => [option.value, option])),
)

const selected = computed(() =>
  groups.flatMap(({ options }) => options).find((option) => option.value === model.value),
)
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    value-key="value"
    variant="none"
    :search-input="
      search
        ? {
            placeholder: search,
            icon: 'i-lucide-search',
            variant: 'none',
            ui: {
              root: 'sel-search',
              base: 'sel-in',
              leading: 'static order-first p-0',
              leadingIcon: 'size-3.5 text-ink-3',
            },
          }
        : false
    "
    :filter-fields="['label', 'native', 'code', 'description']"
    :content="{ align: 'start', sideOffset: 6 }"
    :ui="{
      base: button ? 'btn btn-outline btn-sm sel-btn w-auto' : 'input sel',
      content: wide ? 'pop sel-menu wide' : 'pop sel-menu',
      viewport: 'sel-list',
      group: 'p-0',
      label: 'sel-g',
      item: 'sel-opt',
      empty: 'sel-empty',
      separator: 'sel-sep',
      trailing: 'static',
      leading: 'static',
    }"
    :aria-label="placeholder"
  >
    <template #default>
      <UIcon v-if="button && icon" :name="icon" />
      <span v-if="button">{{ selected?.label ?? placeholder }}</span>
      <span v-else class="sel-v">
        <template v-if="selected">
          <span v-if="selected.code" :class="selected.tone ?? 'plain'" class="lc">{{
            selected.code
          }}</span>
          <span
            v-else-if="selected.icon"
            :class="selected.iconTone"
            class="ico-tile"
            style="width: 22px; height: 22px; border-radius: 7px"
            ><UIcon :name="selected.icon" class="ic-13"
          /></span>
          {{ selected.label
          }}<span v-if="selected.native || selected.context" class="sub">{{
            selected.native || selected.context
          }}</span>
        </template>
        <span v-else class="sel-ph">{{ placeholder }}</span>
      </span>
    </template>
    <template #trailing>
      <UIcon name="i-lucide-chevron-down" class="chev" />
    </template>
    <template #item="{ item }">
      <AppSelectOption v-if="byValue.get(item.value)" :option="byValue.get(item.value) ?? item" />
    </template>
    <template v-if="footer" #content-bottom>
      <div class="sel-foot">
        <span><span class="kbd">↑</span><span class="kbd">↓</span> move</span
        ><span><span class="kbd">↵</span> choose</span>
      </div>
    </template>
  </USelectMenu>
</template>
