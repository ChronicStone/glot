<script setup lang="ts">
import type { ProjectUpdateInput, ProjectView } from '@glot/contract'
import { projectCreateInputSchema, projectUpdateInputSchema } from '@glot/contract/validators'
import { SOURCE_KINDS } from '@glot/database/constants/projects'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'

const open = defineModel<boolean>('open', { required: true })

const { project, workspaceId } = defineProps<{
  project?: ProjectView | undefined
  workspaceId: string
}>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()

async function saved(message: string) {
  await $queryClient.invalidateQueries({ queryKey: $api.projects.key() })
  toast.add({ title: message, color: 'success', icon: 'i-lucide-circle-check' })
  open.value = false
}

function failed(error: Error) {
  toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
}

const create = useMutation(
  $api.projects.create.mutationOptions({
    onSuccess: () => saved('Project added'),
    onError: failed,
  }),
)

const update = useMutation(
  $api.projects.update.mutationOptions({
    onSuccess: () => saved('Project saved'),
    onError: failed,
  }),
)

const languages = project?.languages ?? ['fr', 'en']
const sourceLanguage = project?.sourceLanguage ?? 'fr'

const repository = ref<string>('')
const repositoryError = ref<string>('')

const defaultValues: Omit<ProjectUpdateInput, 'projectId'> = {
  name: project?.name ?? '',
  defaultBranch: '',
  sourceLanguage,
  languages,
  sources: project?.sources.map((source) => ({ ...source })) ?? [
    {
      name: 'shared-base',
      kind: SOURCE_KINDS.VUE_I18N,
      pathPattern: 'locales/{locale}.json',
      sourceLanguage,
      languages,
    },
  ],
}

const form = useForm({
  defaultValues,
  validators: { onSubmit: projectUpdateInputSchema.omit({ projectId: true }) },
  onSubmit: ({ value }) => {
    if (project) {
      return update.mutateAsync({ ...value, projectId: project.id })
    }

    const checked = projectCreateInputSchema.shape.repository.safeParse(repository.value)

    repositoryError.value = checked.success ? '' : 'Write it as owner/name.'

    return checked.success
      ? create.mutateAsync({ ...value, workspaceId, repository: checked.data })
      : undefined
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)

function syncSources(changes: { sourceLanguage?: string; languages?: string[] }) {
  form.setFieldValue('sources', (sources) => sources.map((source) => ({ ...source, ...changes })))
}

function codes(input: string) {
  return input.split(/[\s,]+/u).filter(Boolean)
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    side
    :title="project?.name ?? 'New project'"
    description="One project is one repository."
    icon="i-lucide-layers"
    tone="check"
  >
    <form
      id="project-form"
      class="stack"
      style="gap: 16px"
      @submit.prevent.stop="form.handleSubmit()"
    >
      <form.Field v-slot="{ field }" name="name">
        <div class="field">
          <span class="label">Name people see</span>
          <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
            ><input
              :value="field.state.value"
              aria-label="Name"
              @input="field.handleChange(inputValue($event))"
          /></label>
        </div>
      </form.Field>
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px">
        <div v-if="!project" class="field">
          <span class="label">Repository</span>
          <label :class="{ 'is-error': repositoryError }" class="input"
            ><UIcon name="i-lucide-github" /><input
              v-model="repository"
              class="mono"
              placeholder="owner/name"
              aria-label="Repository"
          /></label>
          <span v-if="repositoryError" class="hint err">{{ repositoryError }}</span>
        </div>
        <form.Field v-slot="{ field }" name="defaultBranch">
          <div class="field">
            <span class="label">Branch</span>
            <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
              ><UIcon name="i-lucide-git-branch" /><input
                :value="field.state.value"
                class="mono"
                placeholder="main"
                aria-label="Branch"
                @input="field.handleChange(inputValue($event))"
            /></label>
          </div>
        </form.Field>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px">
        <form.Field
          v-slot="{ field }"
          name="sourceLanguage"
          :listeners="{
            onChange: ({ value }: { value: string }) => syncSources({ sourceLanguage: value }),
          }"
        >
          <div class="field">
            <span class="label">Source language</span>
            <label class="input"
              ><input
                :value="field.state.value"
                class="mono"
                aria-label="Source language"
                @input="field.handleChange(inputValue($event))"
            /></label>
          </div>
        </form.Field>
        <form.Field
          v-slot="{ field }"
          name="languages"
          :listeners="{
            onChange: ({ value }: { value: string[] }) => syncSources({ languages: value }),
          }"
        >
          <div class="field">
            <span class="label">Languages</span>
            <label class="input"
              ><input
                :value="field.state.value.join(' ')"
                class="mono"
                aria-label="Languages"
                @input="field.handleChange(codes(inputValue($event)))"
            /></label>
          </div>
        </form.Field>
      </div>
      <form.Field v-slot="{ field }" name="sources" mode="array">
        <div class="field">
          <span class="row-flex"
            ><span class="label">Sources</span
            ><span class="hint" style="margin-left: auto"
              >Order = which source wins a key</span
            ></span
          >
          <div class="card" style="padding: 0">
            <div
              v-for="(_, index) in field.state.value"
              :key="index"
              class="src"
              style="grid-template-columns: 20px minmax(0, 1fr) minmax(0, 1.6fr) auto"
            >
              <UIcon name="i-lucide-grip-vertical" class="grip" />
              <form.Field v-slot="{ field: name }" :name="`sources[${index}].name`">
                <label class="input" style="height: 32px"
                  ><input
                    :value="name.state.value"
                    aria-label="Source name"
                    @input="name.handleChange(inputValue($event))"
                /></label>
              </form.Field>
              <form.Field v-slot="{ field: path }" :name="`sources[${index}].pathPattern`">
                <label
                  :class="{ 'is-error': path.state.meta.errors.length > 0 }"
                  class="input"
                  style="height: 32px"
                  ><input
                    :value="path.state.value"
                    class="mono"
                    aria-label="Files"
                    @input="path.handleChange(inputValue($event))"
                /></label>
              </form.Field>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-icon"
                aria-label="Remove the source"
                :disabled="field.state.value.length < 2"
                @click="field.removeValue(index)"
              >
                <UIcon name="i-lucide-x" />
              </button>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            style="align-self: flex-start"
            @click="
              field.pushValue({
                name: '',
                kind: SOURCE_KINDS.VUE_I18N,
                pathPattern: '',
                sourceLanguage: form.getFieldValue('sourceLanguage'),
                languages: form.getFieldValue('languages'),
              })
            "
          >
            <UIcon name="i-lucide-plus" />Add a source
          </button>
          <span class="hint"
            >Files with {locale} for the language, such as locales/{locale}.json.</span
          >
        </div>
      </form.Field>
      <div v-if="project" class="field">
        <span class="label">Apps found in the builds</span>
        <div class="toggles">
          <span v-for="app in project.apps" :key="app.id" class="tog on"
            ><UIcon name="i-lucide-check" class="ic-13" />{{ app.name }}</span
          >
        </div>
      </div>
    </form>
    <template #footer>
      <span class="g-grow" />
      <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
      <button
        type="submit"
        form="project-form"
        class="btn btn-primary"
        :class="{ 'is-loading': submitting }"
      >
        {{ project ? 'Save' : 'Add the project' }}
      </button>
    </template>
  </AppDialog>
</template>
