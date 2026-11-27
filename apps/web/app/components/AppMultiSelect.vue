<script setup lang="ts">
import { languageCodeSchema } from '@glot/contract/validators'

const model = defineModel<string[]>({ required: true })

const { groups, locked = [] } = defineProps<{
  groups: {
    label?: string
    options: {
      value: string
      label: string
      native?: string
      description?: string
      code?: string
      tone?: string
      locked?: boolean
    }[]
  }[]
  locked?: string[]
  placeholder?: string
  search?: string
  createLanguages?: boolean
}>()

const trigger = useTemplateRef<HTMLElement>('trigger')
const measure = useTemplateRef<HTMLElement>('measure')
const visible = ref<number>(Number.POSITIVE_INFINITY)

const options = computed(() => groups.flatMap((group) => group.options))

const items = computed(() =>
  groups.map((group, index) => [
    ...(group.label
      ? [{ type: 'label' as const, value: `group-${index}`, label: group.label }]
      : []),
    ...group.options.map((option) => ({ ...option, disabled: locked.includes(option.value) })),
  ]),
)

const chosen = computed(() =>
  model.value.flatMap((value) => {
    const option = options.value.find((item) => item.value === value)

    return option ? [option] : [{ value, label: languageName(value), code: value }]
  }),
)

function fit() {
  const width = trigger.value?.clientWidth ?? 0
  const tags = [...(measure.value?.children ?? [])].map((tag) => tag.getBoundingClientRect().width)
  const room = width - 44

  let used = 0
  let count = 0

  for (const [index, tag] of tags.entries()) {
    const reserve = index < tags.length - 1 ? 40 : 0

    if (used + tag + reserve > room) {
      break
    }

    used += tag + 4
    count += 1
  }

  visible.value = Math.max(1, count)
}

useResizeObserver(trigger, fit)

watch(chosen, () => nextTick(fit), { deep: true })

function remove(value: string) {
  model.value = model.value.filter((item) => item !== value)
}

function create(code: string) {
  const checked = languageCodeSchema.safeParse(code.trim())

  if (checked.success && !model.value.includes(checked.data)) {
    model.value = [...model.value, checked.data]
  }
}
</script>

<template>
  <div ref="trigger" style="position: relative; min-width: 0">
    <div ref="measure" class="sel-measure" aria-hidden="true">
      <span v-for="option in chosen" :key="option.value" class="sel-tag"
        ><span :class="option.tone ?? 'plain'" class="lc">{{ option.code }}</span>{{ option.label
        }}<span class="x"><UIcon name="i-lucide-x" class="ic-13" /></span
      ></span>
    </div>
    <USelectMenu
      v-model="model"
      multiple
      :items="items"
      value-key="value"
      variant="none"
      :search-input="{
        placeholder: search ?? 'Find',
        icon: 'i-lucide-search',
        variant: 'none',
        ui: {
          root: 'sel-search',
          base: 'sel-in',
          leading: 'static order-first p-0',
          leadingIcon: 'size-3.5 text-ink-3',
        },
      }"
      :create-item="createLanguages ? 'always' : false"
      :filter-fields="['label', 'native', 'code']"
      :content="{ align: 'start', sideOffset: 6 }"
      :ui="{
        base: 'input sel multi',
        content: 'pop sel-menu',
        viewport: 'sel-list',
        group: 'p-0',
        label: 'sel-g',
        item: 'sel-opt',
        empty: 'sel-empty',
        trailing: 'static',
      }"
      :aria-label="placeholder"
      class="w-full"
      @create="create"
    >
      <template #default>
        <span class="sel-v">
          <span v-if="chosen.length === 0" class="sel-ph">{{ placeholder }}</span>
          <span class="sel-chips">
            <span
              v-for="option in chosen.slice(0, visible)"
              :key="option.value"
              :class="{ lock: locked.includes(option.value) }"
              class="sel-tag"
              ><span :class="option.tone ?? 'plain'" class="lc">{{ option.code }}</span
              >{{ option.label
              }}<UIcon v-if="locked.includes(option.value)" name="i-lucide-lock" /><span
                v-else
                class="x"
                role="button"
                :aria-label="`Remove ${option.label}`"
                @pointerdown.stop.prevent
                @click.stop.prevent="remove(option.value)"
                ><UIcon name="i-lucide-x" class="ic-13" /></span
            ></span>
            <span
              v-if="chosen.length > visible"
              class="sel-tag more"
              :title="
                chosen
                  .slice(visible)
                  .map(({ label }) => label)
                  .join(', ')
              "
              >+{{ chosen.length - visible }}</span
            >
          </span>
        </span>
      </template>
      <template #trailing>
        <UIcon name="i-lucide-chevron-down" class="chev" />
      </template>
      <template #item="{ item }">
        <AppSelectOption
          v-if="'value' in item"
          :option="{ ...item, locked: locked.includes(item.value) }"
          multiple
          :selected="model.includes(item.value)"
        />
      </template>
      <template #create-item-label="{ item }">Add the language “{{ item }}”</template>
      <template #content-bottom>
        <div class="sel-foot">
          <span>{{ model.length }} languages</span>
        </div>
      </template>
    </USelectMenu>
  </div>
</template>
