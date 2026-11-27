<script setup lang="ts">
import type { GlossaryTerm } from '@glot/contract'
import { glossaryConceptCreateInputSchema } from '@glot/contract/validators'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'

const open = defineModel<boolean>('open', { required: true })

const { concept, workspaceId, languages } = defineProps<{
  concept?: GlossaryTerm | undefined
  workspaceId: string
  languages: string[]
}>()

const emit = defineEmits<{ saved: [conceptId: string] }>()
const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const serverError = ref<string>('')

async function saved(result: GlossaryTerm) {
  await $queryClient.invalidateQueries({ queryKey: $api.glossary.key() })
  toast.add({
    title: concept ? 'Concept saved' : 'Concept added',
    color: 'success',
    icon: 'i-lucide-circle-check',
  })
  emit('saved', result.id)
  open.value = false
}

function failed(error: Error) {
  serverError.value = error.message
}

const create = useMutation(
  $api.glossary.createConcept.mutationOptions({ onSuccess: saved, onError: failed }),
)

const update = useMutation(
  $api.glossary.updateConcept.mutationOptions({ onSuccess: saved, onError: failed }),
)

const form = useForm({
  defaultValues: {
    name: concept?.name ?? '',
    definition: concept?.definition ?? '',
    neverTranslate: concept?.neverTranslate ?? false,
    notes: concept?.notes ?? '',
    rows: languages.map((language) => ({
      language,
      term: concept?.terms[language]?.term ?? '',
      plural: concept?.terms[language]?.plural ?? '',
      avoid: concept?.terms[language]?.avoid ?? [],
    })),
  },
  onSubmit: ({ value }) => {
    serverError.value = ''

    const details = {
      name: value.name,
      definition: value.definition,
      neverTranslate: value.neverTranslate,
      notes: value.notes,
      terms: Object.fromEntries(
        value.rows
          .filter(({ term }) => term.trim())
          .map(({ language, term, plural, avoid }) => [
            language,
            { term, plural: plural.trim() || null, avoid },
          ]),
      ),
    }

    return (
      concept
        ? update.mutateAsync({ conceptId: concept.id, ...details })
        : create.mutateAsync({ workspaceId, ...details })
    ).catch(() => undefined)
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)
</script>

<template>
  <AppDialog
    v-model:open="open"
    side
    wide
    :title="concept?.name ?? 'New concept'"
    description="A word your product always translates the same way."
    icon="i-lucide-book-open-text"
    tone="check"
  >
    <form
      novalidate
      id="concept-form"
      class="stack"
      style="gap: 16px"
      @submit.prevent.stop="form.handleSubmit()"
    >
      <form.Field
        v-slot="{ field }"
        name="name"
        :validators="{ onSubmit: glossaryConceptCreateInputSchema.shape.name }"
      >
        <div class="field">
          <span class="label">Concept</span>
          <label :class="{ 'is-error': errorMessage(field.state.meta.errors) }" class="input"
            ><input
              :value="field.state.value"
              placeholder="lot"
              aria-label="Concept"
              @input="field.handleChange(inputValue($event))"
          /></label>
          <span v-if="errorMessage(field.state.meta.errors)" class="hint err"
            ><UIcon name="i-lucide-circle-alert" />{{ errorMessage(field.state.meta.errors) }}</span
          >
        </div>
      </form.Field>
      <form.Field v-slot="{ field }" name="definition">
        <div class="field">
          <span class="label">What it means</span>
          <label class="input textarea">
            <textarea
              :value="field.state.value"
              rows="2"
              placeholder="An item sold at auction. Never a plot of land."
              aria-label="Definition"
              @input="field.handleChange(inputValue($event))"
            />
          </label>
        </div>
      </form.Field>
      <form.Field v-slot="{ field }" name="neverTranslate">
        <div class="row-flex" style="gap: 12px">
          <div class="g-grow">
            <div id="never-translated" class="r-title" style="font-size: 13px">
              Never translated
            </div>
            <div class="r-sub">
              A brand or product name that stays as written in every language.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="field.state.value"
            aria-labelledby="never-translated"
            :class="{ on: field.state.value }"
            class="switch"
            @click="field.handleChange(!field.state.value)"
          />
        </div>
      </form.Field>
      <div class="field">
        <span class="label">Words per language</span>
        <div class="term-rows">
          <div class="term-row head">
            <span /><span>Word</span><span>Plural</span><span>Never use</span>
          </div>
          <div v-for="(language, index) in languages" :key="language" class="term-row">
            <span class="lc plain">{{ language }}</span>
            <form.Field v-slot="{ field }" :name="`rows[${index}].term`">
              <label class="input"
                ><input
                  :value="field.state.value"
                  :aria-label="`${languageName(language)} word`"
                  @input="field.handleChange(inputValue($event))"
              /></label>
            </form.Field>
            <form.Field v-slot="{ field }" :name="`rows[${index}].plural`">
              <label class="input"
                ><input
                  :value="field.state.value"
                  :aria-label="`${languageName(language)} plural`"
                  @input="field.handleChange(inputValue($event))"
              /></label>
            </form.Field>
            <form.Field v-slot="{ field }" :name="`rows[${index}].avoid`">
              <AppTagInput
                :model-value="field.state.value"
                :label="`${languageName(language)} words to avoid`"
                placeholder="Type and press Enter"
                @update:model-value="field.handleChange"
              />
            </form.Field>
          </div>
        </div>
      </div>
      <div v-if="serverError" class="banner fix">
        <UIcon name="i-lucide-triangle-alert" /><span>{{ serverError }}</span>
      </div>
    </form>
    <template #footer>
      <span class="g-grow" />
      <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
      <button
        type="submit"
        form="concept-form"
        class="btn btn-primary"
        :class="{ 'is-loading': submitting }"
      >
        {{ concept ? 'Save' : 'Add the concept' }}
      </button>
    </template>
  </AppDialog>
</template>
