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

async function fit() {
  visible.value = Number.POSITIVE_INFINITY

  await nextTick()

  const box = trigger.value?.querySelector('.sel-v')?.getBoundingClientRect()

  const tags = [...(trigger.value?.querySelectorAll('.sel-chips > .sel-tag:not(.more)') ?? [])].map(
    (tag) => tag.getBoundingClientRect().right,
  )

  if (!box || tags.every((right) => right <= box.right)) {
    return
  }

  visible.value = Math.max(1, tags.filter((right) => right <= box.right - 44).length)
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
