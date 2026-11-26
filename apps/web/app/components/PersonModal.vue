<script setup lang="ts">
import type { Person, PersonInviteInput } from '@glot/contract'
import { personInviteInputSchema } from '@glot/contract/validators'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { ROLE_LABELS } from '../constants/people.constants.ts'

const open = defineModel<boolean>('open', { required: true })

const { person, workspaceId } = defineProps<{
  person?: Person | undefined
  workspaceId: string
}>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const languages = useWorkspaceLanguages()

const roles = Object.values(WORKSPACE_ROLES).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
  disabled: role === WORKSPACE_ROLES.OWNER,
}))

async function saved(message: string) {
  await $queryClient.invalidateQueries({ queryKey: $api.people.key() })
  toast.add({ title: message, color: 'success', icon: 'i-lucide-check' })
  open.value = false
}

const invite = useMutation(
  $api.people.invite.mutationOptions({
    onSuccess: (invited) => saved(`Sign-in link sent to ${invited.user.email}`),
  }),
)

const update = useMutation(
  $api.people.update.mutationOptions({ onSuccess: () => saved('Access changed') }),
)

const remove = useMutation(
  $api.people.remove.mutationOptions({ onSuccess: () => saved('Removed from the workspace') }),
)

const defaultValues: PersonInviteInput = {
  workspaceId,
  email: person?.user.email ?? '',
  role: person?.role ?? WORKSPACE_ROLES.WRITER,
  languages: person ? person.languages : [],
  expiresAt: person?.expiresAt ?? null,
}

const form = useForm({
  defaultValues,
  validators: { onSubmit: personInviteInputSchema },
  onSubmit: ({ value }) =>
    person
      ? update.mutateAsync({
          membershipId: person.id,
          role: value.role,
          languages: value.languages,
          expiresAt: value.expiresAt ?? null,
        })
      : invite.mutateAsync(value),
})

const submitting = form.useSelector((state) => state.isSubmitting)

function dateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : ''
}

function dateValue(input: string) {
  return input ? new Date(`${input}T23:59:59Z`) : null
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="person ? person.user.name : 'Invite someone'"
    :description="person ? person.user.email : 'They get a sign-in link by email.'"
  >
    <template #body>
      <form id="person-form" class="flex flex-col gap-4" @submit.prevent.stop="form.handleSubmit()">
        <template v-if="!person">
          <form.Field v-slot="{ field }" name="email">
            <UFormField
              label="Email"
              required
              :error="field.state.meta.errors[0]?.message ?? false"
            >
              <UInput
                :model-value="field.state.value"
                type="email"
                class="w-full"
                autofocus
                @update:model-value="field.handleChange"
                @blur="field.handleBlur"
              />
            </UFormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="name">
            <UFormField label="Name">
              <UInput
                :model-value="field.state.value ?? ''"
                class="w-full"
                @update:model-value="(name: string) => field.handleChange(name || undefined)"
              />
            </UFormField>
          </form.Field>
        </template>
        <form.Field v-slot="{ field }" name="role">
          <UFormField label="Role">
            <USelect
              :model-value="field.state.value"
              :items="roles"
              class="w-full"
              @update:model-value="field.handleChange"
            />
          </UFormField>
        </form.Field>
        <form.Field v-slot="{ field }" name="languages">
          <UFormField label="Languages they change">
            <div class="flex flex-col gap-3">
              <USwitch
                :model-value="field.state.value === null"
                label="Every language"
                @update:model-value="(every: boolean) => field.handleChange(every ? null : [])"
              />
              <UCheckboxGroup
                v-if="field.state.value !== null"
                :model-value="field.state.value"
                :items="languages"
                orientation="horizontal"
                variant="card"
                :ui="{ item: 'font-mono' }"
                @update:model-value="field.handleChange"
              />
            </div>
          </UFormField>
        </form.Field>
        <form.Field v-slot="{ field }" name="expiresAt">
          <UFormField label="Access until" hint="Leave empty for ongoing access">
            <UInput
              :model-value="dateInput(field.state.value ?? null)"
              type="date"
              class="w-full"
              @update:model-value="(input: string) => field.handleChange(dateValue(input))"
            />
          </UFormField>
        </form.Field>
      </form>
    </template>
    <template #footer>
      <UButton
        v-if="person"
        label="Remove"
        color="error"
        variant="ghost"
        :loading="remove.isPending.value"
        @click="remove.mutate({ membershipId: person.id })"
      />
      <span class="flex-1" />
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton
        type="submit"
        form="person-form"
        color="neutral"
        :label="person ? 'Save' : 'Send invitation'"
        :loading="submitting"
      />
    </template>
  </UModal>
</template>
