<script setup lang="ts">
import type { AiSettingsView } from '@glot/contract'
import { aiUpdateSettingsInputSchema } from '@glot/contract/validators'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { AI_PROVIDER_LABELS } from '../constants/ai.constants.ts'

const { workspaceId, settings } = defineProps<{ workspaceId: string; settings: AiSettingsView }>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const keyFor = ref<AiSettingsView['provider'] | undefined>()

const keyOpen = computed({
  get: () => keyFor.value !== undefined,
  set: (open: boolean) => {
    if (!open) {
      keyFor.value = undefined
    }
  },
})

const providers = computed(() =>
  settings.keys.map((key) => ({ value: key.provider, label: AI_PROVIDER_LABELS[key.provider] })),
)

async function refresh() {
  await $queryClient.invalidateQueries({ queryKey: $api.ai.key() })
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

const update = useMutation(
  $api.ai.updateSettings.mutationOptions({
    onSuccess: async () => {
      await refresh()
      toast.add({ title: 'AI settings saved', color: 'success', icon: 'i-lucide-check' })
    },
    onError: failed,
  }),
)

const removeKey = useMutation(
  $api.ai.removeKey.mutationOptions({ onSuccess: refresh, onError: failed }),
)

const form = useForm({
  defaultValues: {
    workspaceId,
    provider: settings.provider,
    model: settings.model,
    monthlyBudgetUsd: settings.monthlyBudgetUsd,
  },
  validators: { onSubmit: aiUpdateSettingsInputSchema },
  onSubmit: async ({ value }) => {
    await update.mutateAsync(value)
  },
})

const provider = form.useStore((state) => state.values.provider)

function chooseProvider(next: AiSettingsView['provider']) {
  form.setFieldValue('provider', next)

  form.setFieldValue(
    'model',
    settings.defaults.find((entry) => entry.provider === next)?.model ?? settings.model,
  )
}
</script>

<template>
  <div class="stack" style="gap: 12px">
    <section class="panel">
      <div class="panel-h"><h3>Provider</h3></div>
      <form
        novalidate
        class="stack"
        style="gap: 14px; padding: 8px 24px 20px"
        @submit.prevent.stop="form.handleSubmit()"
      >
        <div class="field">
          <span class="label">Who writes the texts</span>
          <AppSegmented
            :model-value="provider"
            :items="providers"
            @update:model-value="chooseProvider"
          />
        </div>
        <form.Field v-slot="{ field }" name="model">
          <div class="field">
            <span class="label">Model</span>
            <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
              ><input
                :value="field.state.value"
                class="mono"
                aria-label="Model"
                @input="field.handleChange(inputValue($event))"
            /></label>
            <span v-if="field.state.meta.errors.length > 0" class="hint err">{{
              errorMessage(field.state.meta.errors)
            }}</span>
          </div>
        </form.Field>
        <form.Field v-slot="{ field }" name="monthlyBudgetUsd">
          <div class="field">
            <span class="label">Monthly budget</span>
            <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
              ><UIcon name="i-lucide-dollar-sign" /><input
                :value="field.state.value"
                type="number"
                min="0"
                step="1"
                inputmode="decimal"
                aria-label="Monthly budget in US dollars"
                @input="field.handleChange(Number(inputValue($event)))"
            /></label>
            <span v-if="field.state.meta.errors.length > 0" class="hint err">{{
              errorMessage(field.state.meta.errors)
            }}</span>
            <span v-else class="hint"
              >At 100% AI fills pause until the 1st; writing and reviews go on.</span
            >
          </div>
        </form.Field>
        <div class="row-flex">
          <span class="grow" />
          <button
            type="submit"
            class="btn btn-primary btn-sm"
            :class="{ 'is-loading': update.isPending.value }"
          >
            Save
          </button>
        </div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-h">
        <h3>Keys</h3>
        <span class="meta">stored encrypted, never shown again</span>
      </div>
      <div class="rows" style="padding: 8px 24px 14px">
        <div v-for="key in settings.keys" :key="key.provider" class="r">
          <span class="ico-tile ai"><UIcon name="i-lucide-sparkle" /></span>
          <div class="grow">
            <div class="r-title">{{ AI_PROVIDER_LABELS[key.provider] }}</div>
            <div class="r-sub">
              <template v-if="key.set">Key <span class="mono">••••{{ key.last4 }}</span></template>
              <template v-else>No key</template>
              <template v-if="key.provider === settings.provider"> · writes the texts</template>
            </div>
          </div>
          <template v-if="key.set">
            <span class="pill ok"><UIcon name="i-lucide-check" />Set</span>
            <button type="button" class="btn btn-ghost btn-sm" @click="keyFor = key.provider">
              Replace
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-icon"
              :aria-label="`Remove the ${AI_PROVIDER_LABELS[key.provider]} key`"
              @click="removeKey.mutate({ workspaceId, provider: key.provider })"
            >
              <UIcon name="i-lucide-trash-2" />
            </button>
          </template>
          <button
            v-else
            type="button"
            class="btn btn-outline btn-sm"
            @click="keyFor = key.provider"
          >
            <UIcon name="i-lucide-plus" />Add a key
          </button>
        </div>
      </div>
    </section>
    <AiKeyModal
      v-if="keyFor"
      v-model:open="keyOpen"
      :workspace-id="workspaceId"
      :provider="keyFor"
    />
  </div>
</template>
