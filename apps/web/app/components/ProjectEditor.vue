<script setup lang="ts">
import type { ProjectUpdateInput, ProjectView } from '@glot/contract'
import { projectCreateInputSchema, projectSourceInputSchema } from '@glot/contract/validators'
import { SOURCE_KINDS } from '@glot/database/constants/projects'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { SUGGESTED_LANGUAGES } from '../constants/languages.constants.ts'
import { SOURCE_LAYOUTS } from '../constants/sources.constants.ts'

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

const serverError = ref<string>('')

function failed(error: Error) {
  serverError.value = error.message
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
  defaultBranch: project?.defaultBranch ?? '',
  sourceLanguage,
  languages,
  previewUrl: project?.previewUrl ?? null,
  sources: project?.sources.map((source) => ({ ...source })) ?? [
    {
      name: 'shared-base',
      kind: SOURCE_KINDS.VUE_I18N,
      pathPattern: sourcePattern({
        folder: 'locales',
        layout: SOURCE_LAYOUTS.FILE_PER_LANGUAGE,
        fileName: '',
      }),
      sourceLanguage,
      languages,
    },
  ],
}

const form = useForm({
  defaultValues,
  onSubmit: ({ value }) => {
    serverError.value = ''

    if (project) {
      return update.mutateAsync({ ...value, projectId: project.id }).catch(() => undefined)
    }

    const checked = projectCreateInputSchema.shape.repository.safeParse(repository.value)

    repositoryError.value = checked.success ? '' : 'Write it as owner/name.'

    return checked.success
      ? create
          .mutateAsync({ ...value, workspaceId, repository: checked.data })
          .catch(() => undefined)
      : undefined
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)

function syncSources(changes: { sourceLanguage?: string; languages?: string[] }) {
  form.setFieldValue('sources', (sources) => sources.map((source) => ({ ...source, ...changes })))
}

const editing = ref<number | undefined>(project ? undefined : 0)

function languageOption(code: string) {
  return { value: code, code, label: languageName(code), native: nativeLanguageName(code) }
}

const known = computed(() => [
  ...new Set([...Object.values(SUGGESTED_LANGUAGES), ...form.state.values.languages]),
])

const sourceGroups = computed(() => [
  { options: known.value.map((code) => ({ ...languageOption(code), tone: 'base' })) },
])

const languageGroups = computed(() => {
  const chosen = form.state.values.languages
  const source = form.state.values.sourceLanguage

  return [
    { label: 'Source', options: [{ ...languageOption(source), tone: 'base' }] },
    {
      label: 'In this project',
      options: chosen.filter((code) => code !== source).map((code) => languageOption(code)),
    },
    {
      label: 'Add',
      options: known.value
        .filter((code) => !chosen.includes(code))
        .map((code) => languageOption(code)),
    },
  ].filter((group) => group.options.length > 0)
})

function updateShape(options: {
  index: number
  change: Partial<{ folder: string; layout: string; fileName: string }>
}) {
  form.setFieldValue(`sources[${options.index}].pathPattern`, (pattern) =>
    sourcePattern({ ...sourceShape(pattern), ...options.change }),
  )
}

function addSource() {
  form.pushFieldValue('sources', {
    name: '',
    kind: SOURCE_KINDS.VUE_I18N,
    pathPattern: sourcePattern({
      folder: '',
      layout: SOURCE_LAYOUTS.FILE_PER_LANGUAGE,
      fileName: '',
    }),
    sourceLanguage: form.state.values.sourceLanguage,
    languages: form.state.values.languages,
  })
  editing.value = form.state.values.sources.length - 1
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    side
    wide
    :title="project?.name ?? 'New project'"
    description="One project is one repository."
    icon="i-lucide-layers"
    tone="check"
  >
    <form
      novalidate
      id="project-form"
      class="stack"
      style="gap: 16px"
      @submit.prevent.stop="form.handleSubmit()"
    >
      <form.Field
        v-slot="{ field }"
        name="name"
        :validators="{ onSubmit: projectCreateInputSchema.shape.name }"
      >
        <div class="field">
          <span class="label">Name people see</span>
          <label :class="{ 'is-error': errorMessage(field.state.meta.errors) }" class="input"
            ><input
              :value="field.state.value"
              aria-label="Name"
              @input="field.handleChange(inputValue($event))"
          /></label>
          <span v-if="errorMessage(field.state.meta.errors)" class="hint err"
            ><UIcon name="i-lucide-circle-alert" />{{ errorMessage(field.state.meta.errors) }}</span
          >
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
          <span v-if="repositoryError" class="hint err"
            ><UIcon name="i-lucide-circle-alert" />{{ repositoryError }}</span
          >
        </div>
        <form.Field
          v-slot="{ field }"
          name="defaultBranch"
          :validators="{ onSubmit: projectCreateInputSchema.shape.defaultBranch }"
        >
          <div class="field">
            <span class="label">Branch</span>
            <label :class="{ 'is-error': errorMessage(field.state.meta.errors) }" class="input"
              ><UIcon name="i-lucide-git-branch" /><input
                :value="field.state.value"
                class="mono"
                placeholder="main"
                aria-label="Branch"
                @input="field.handleChange(inputValue($event))"
            /></label>
            <span v-if="errorMessage(field.state.meta.errors)" class="hint err"
              ><UIcon name="i-lucide-circle-alert" />{{
                errorMessage(field.state.meta.errors)
              }}</span
            >
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
            <AppSelect
              :model-value="field.state.value"
              :groups="sourceGroups"
              search="Find a language"
              placeholder="Source language"
              @update:model-value="field.handleChange"
            />
          </div>
        </form.Field>
        <form.Field
          v-slot="{ field }"
          name="languages"
          :validators="{ onSubmit: projectCreateInputSchema.shape.languages }"
          :listeners="{
            onChange: ({ value }: { value: string[] }) => syncSources({ languages: value }),
          }"
        >
          <div class="field">
            <span class="label">Languages</span>
            <AppMultiSelect
              :model-value="field.state.value"
              :groups="languageGroups"
              :locked="[form.state.values.sourceLanguage]"
              search="Find a language or type a code"
              placeholder="Languages"
              create-languages
              @update:model-value="field.handleChange"
            />
            <span v-if="errorMessage(field.state.meta.errors)" class="hint err"
              ><UIcon name="i-lucide-circle-alert" />{{
                errorMessage(field.state.meta.errors)
              }}</span
            >
          </div>
        </form.Field>
      </div>
      <form.Field
        v-slot="{ field }"
        name="previewUrl"
        :validators="{ onSubmit: projectCreateInputSchema.shape.previewUrl }"
      >
        <div class="field">
          <span class="label">Preview adapter address</span>
          <label :class="{ 'is-error': errorMessage(field.state.meta.errors) }" class="input"
            ><UIcon name="i-lucide-mail" /><input
              :value="field.state.value ?? ''"
              class="mono"
              placeholder="https://previews.example.com"
              aria-label="Preview adapter address"
              @input="field.handleChange(inputValue($event).trim() || null)"
          /></label>
          <span v-if="errorMessage(field.state.meta.errors)" class="hint err"
            ><UIcon name="i-lucide-circle-alert" />{{ errorMessage(field.state.meta.errors) }}</span
          >
          <span v-else class="hint">Optional. Shows the project’s emails, documents and SMS.</span>
        </div>
      </form.Field>
      <form.Field v-slot="{ field }" name="sources" mode="array">
        <div class="field">
          <span class="row-flex"
            ><span class="label">Sources</span
            ><span class="hint" style="margin-left: auto"
              >Order = which source wins a key</span
            ></span
          >
          <div class="card" style="padding: 0">
            <div v-for="(source, index) in field.state.value" :key="index" class="srcard">
              <UIcon name="i-lucide-grip-vertical" class="grip" />
              <div style="min-width: 0">
                <div class="nm">
                  {{ source.name || 'New source' }}<span class="tag">{{ source.kind }}</span>
                </div>
                <SourceRule :path-pattern="source.pathPattern" />
                <div class="langs">
                  <span
                    v-for="code in source.languages"
                    :key="code"
                    :class="code === source.sourceLanguage ? 'base' : 'plain'"
                    class="lc"
                    >{{ code }}</span
                  >
                </div>
                <div v-if="editing === index" class="stack" style="gap: 12px; margin-top: 14px">
                  <form.Field
                    v-slot="{ field: name }"
                    :name="`sources[${index}].name`"
                    :validators="{ onSubmit: projectSourceInputSchema.shape.name }"
                  >
                    <div class="field">
                      <span class="label">Name</span>
                      <label
                        :class="{ 'is-error': errorMessage(name.state.meta.errors) }"
                        class="input"
                        ><input
                          :value="name.state.value"
                          placeholder="Shared base"
                          aria-label="Source name"
                          @input="name.handleChange(inputValue($event))"
                      /></label>
                      <span v-if="errorMessage(name.state.meta.errors)" class="hint err"
                        ><UIcon name="i-lucide-circle-alert" />{{
                          errorMessage(name.state.meta.errors)
                        }}</span
                      >
                    </div>
                  </form.Field>
                  <form.Field
                    v-slot="{ field: path }"
                    :name="`sources[${index}].pathPattern`"
                    :validators="{ onSubmit: projectSourceInputSchema.shape.pathPattern }"
                  >
                    <div class="field">
                      <span class="label">Folder of the language files</span>
                      <label
                        :class="{ 'is-error': errorMessage(path.state.meta.errors) }"
                        class="input"
                        ><UIcon name="i-lucide-folder" /><input
                          :value="sourceShape(path.state.value).folder"
                          class="mono"
                          placeholder="packages/translations/i18n/locales"
                          aria-label="Folder"
                          @input="updateShape({ index, change: { folder: inputValue($event) } })"
                      /></label>
                      <span v-if="errorMessage(path.state.meta.errors)" class="hint err"
                        ><UIcon name="i-lucide-circle-alert" />{{
                          errorMessage(path.state.meta.errors)
                        }}</span
                      >
                    </div>
                    <div class="field">
                      <span class="label">How the files are named</span>
                      <div class="pk-layouts">
                        <button
                          type="button"
                          :class="{
                            on:
                              sourceShape(path.state.value).layout ===
                              SOURCE_LAYOUTS.FILE_PER_LANGUAGE,
                          }"
                          class="pk-layout"
                          @click="
                            updateShape({
                              index,
                              change: { layout: SOURCE_LAYOUTS.FILE_PER_LANGUAGE },
                            })
                          "
                        >
                          <b>One file per language</b
                          ><span class="mini">…/<i>fr</i>.json<br />…/<i>en</i>.json</span>
                        </button>
                        <button
                          type="button"
                          :class="{
                            on:
                              sourceShape(path.state.value).layout ===
                              SOURCE_LAYOUTS.FOLDER_PER_LANGUAGE,
                          }"
                          class="pk-layout"
                          @click="
                            updateShape({
                              index,
                              change: { layout: SOURCE_LAYOUTS.FOLDER_PER_LANGUAGE },
                            })
                          "
                        >
                          <b>One folder per language</b
                          ><span class="mini"
                            >…/<i>fr</i>/{{ sourceShape(path.state.value).fileName
                            }}<br />…/<i>en</i>/{{ sourceShape(path.state.value).fileName }}</span
                          >
                        </button>
                      </div>
                    </div>
                    <div
                      v-if="
                        sourceShape(path.state.value).layout === SOURCE_LAYOUTS.FOLDER_PER_LANGUAGE
                      "
                      class="field"
                    >
                      <span class="label">File inside each language folder</span>
                      <label class="input" style="max-width: 280px"
                        ><UIcon name="i-lucide-file-json" /><input
                          :value="sourceShape(path.state.value).fileName"
                          class="mono"
                          aria-label="File name"
                          @input="updateShape({ index, change: { fileName: inputValue($event) } })"
                      /></label>
                    </div>
                  </form.Field>
                </div>
              </div>
              <div class="row-flex" style="gap: 2px; align-self: flex-start">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="editing = editing === index ? undefined : index"
                >
                  <UIcon :name="editing === index ? 'i-lucide-check' : 'i-lucide-folder-pen'" />{{
                    editing === index ? 'Done' : 'Change'
                  }}
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-icon"
                  aria-label="Remove the source"
                  :disabled="field.state.value.length < 2"
                  @click="field.removeValue(index)"
                >
                  <UIcon name="i-lucide-x" />
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            style="align-self: flex-start"
            @click="addSource"
          >
            <UIcon name="i-lucide-plus" />Add a source
          </button>
        </div>
      </form.Field>
      <div v-if="serverError" class="banner fix">
        <UIcon name="i-lucide-triangle-alert" /><span>{{ serverError }}</span>
      </div>
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
