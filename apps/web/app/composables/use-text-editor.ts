import type { Text, Translation } from '@glot/contract'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'

export function useTextEditor(options: {
  text: () => Text | undefined
  translation: () => Translation | undefined
  onDone?: () => void
}) {
  const { $api, $queryClient } = useNuxtApp()
  const toast = useToast()
  const session = useNuxtApp().$auth.useSession()
  const { project } = useCurrentProject()
  const { write, approve } = useRights()

  const translation = computed(options.translation)
  const own = computed(() => translation.value?.draft?.authorId === session.value.data?.user.id)

  const canWrite = computed(() =>
    Boolean(translation.value && write.value.includes(translation.value.language)),
  )

  const canApprove = computed(() =>
    Boolean(translation.value && approve.value.includes(translation.value.language)),
  )

  const original = computed(
    () => (own.value ? translation.value?.draft?.value : translation.value?.value) ?? '',
  )

  function check(target: string) {
    const text = options.text()

    return text
      ? textCheckError({
          source: text.source.value,
          target,
          syntax: text.syntax,
          ...(translation.value ? { language: translation.value.language } : {}),
        })
      : undefined
  }

  const form = useForm({
    defaultValues: { value: original.value },
    validators: {
      onMount: ({ value }) => check(value.value),
      onChange: ({ value }) => check(value.value),
    },
  })

  const value = form.useSelector((state) => state.values.value)
  const invalid = form.useSelector((state) => !state.isValid || !state.values.value.trim())
  const error = form.useSelector((state) => errorMessage(state.errors))
  const changed = computed(() => value.value.trim() !== original.value.trim())

  watch(original, async (next) => {
    form.reset({ value: next })
    await form.validate('change')
  })

  const target = computed(() => ({
    projectId: project.value?.id ?? '',
    textId: options.text()?.id ?? '',
    language: translation.value?.language ?? '',
  }))

  async function done(title: string) {
    options.onDone?.()
    toast.add({ title, icon: 'i-lucide-circle-check', color: 'success' })

    await Promise.all([
      $queryClient.invalidateQueries({ queryKey: $api.texts.key() }),
      $queryClient.invalidateQueries({ queryKey: $api.reviews.key() }),
      $queryClient.invalidateQueries({ queryKey: $api.templates.key() }),
    ])
  }

  function failed(problem: Error) {
    toast.add({ title: problem.message, icon: 'i-lucide-circle-alert', color: 'error' })
  }

  const approveNow = useMutation({
    mutationFn: () => {
      const draft = translation.value?.draft

      if (changed.value) {
        return $api.reviews.editAndApprove.call({ ...target.value, value: value.value })
      }

      return $api.reviews.approve.call({
        ...target.value,
        ...(draft?.status === DRAFT_STATUSES.IN_REVIEW ? { draftId: draft.id } : {}),
      })
    },
    onSuccess: () => done(`${languageName(target.value.language)} approved`),
    onError: failed,
  })

  const sendNow = useMutation({
    mutationFn: async () => {
      const saved = await $api.drafts.save.call({ ...target.value, value: value.value })

      return $api.drafts.send.call({ projectId: target.value.projectId, draftId: saved.id })
    },
    onSuccess: () => done('Sent for review'),
    onError: failed,
  })

  const saveNow = useMutation({
    mutationFn: () => $api.drafts.save.call({ ...target.value, value: value.value }),
    onSuccess: () => done('Draft saved'),
    onError: failed,
  })

  return {
    form,
    value,
    invalid,
    error,
    changed,
    own,
    canWrite,
    canApprove,
    target,
    done,
    failed,
    approveNow,
    sendNow,
    saveNow,
  }
}
