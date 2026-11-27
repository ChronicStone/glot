<script setup lang="ts">
import type { Person, PersonInviteInput } from '@glot/contract'
import { personInviteInputSchema } from '@glot/contract/validators'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../constants/people.constants.ts'

const open = defineModel<boolean>('open', { required: true })

const { person, workspaceId } = defineProps<{
  person?: Person | undefined
  workspaceId: string
}>()

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const languages = useWorkspaceLanguages()

const roles = Object.values(WORKSPACE_ROLES).filter((role) => role !== WORKSPACE_ROLES.OWNER)

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
  <AppDialog
    v-model:open="open"
    :title="person ? person.user.name : 'Invite someone'"
    :description="
      person
        ? person.user.email
        : 'They get a sign-in link by email. Nothing is shared until they sign in.'
    "
    :icon="person ? 'i-lucide-user-cog' : 'i-lucide-user-plus'"
  >
    <form
      id="person-form"
      class="stack"
      style="gap: 16px"
      @submit.prevent.stop="form.handleSubmit()"
    >
      <div v-if="!person" style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px">
        <form.Field v-slot="{ field }" name="email">
          <div class="field">
            <span class="label">Email</span>
            <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
              ><UIcon name="i-lucide-at-sign" /><input
                :value="field.state.value"
                type="email"
                autofocus
                aria-label="Email"
                @input="field.handleChange(inputValue($event))"
                @blur="field.handleBlur"
            /></label>
            <span v-if="field.state.meta.errors[0]" class="hint err">{{
              field.state.meta.errors[0]?.message
            }}</span>
          </div>
        </form.Field>
        <form.Field v-slot="{ field }" name="name">
          <div class="field">
            <span class="label">Name</span>
            <label class="input"
              ><input
                :value="field.state.value ?? ''"
                aria-label="Name"
                @input="field.handleChange(inputValue($event) || undefined)"
            /></label>
          </div>
        </form.Field>
      </div>
      <form.Field v-slot="{ field }" name="role">
        <div class="field">
          <span class="label">Role</span>
          <div class="role-cards">
            <button
              v-for="role in roles"
              :key="role"
              type="button"
              :class="{ on: field.state.value === role }"
              class="role-card"
              @click="field.handleChange(role)"
            >
              <b>{{ ROLE_LABELS[role] }}</b><span>{{ ROLE_DESCRIPTIONS[role] }}</span>
            </button>
          </div>
        </div>
      </form.Field>
      <form.Field v-slot="{ field }" name="languages">
        <div class="field">
          <span class="label">Languages they change</span>
          <div class="toggles">
            <button
              type="button"
              :class="{ on: field.state.value === null }"
              class="tog"
              @click="field.handleChange(field.state.value === null ? [] : null)"
            >
              <UIcon v-if="field.state.value === null" name="i-lucide-check" class="ic-13" />All
              languages
            </button>
            <button
              v-for="code in languages"
              :key="code"
              type="button"
              :class="{ on: field.state.value?.includes(code), dis: field.state.value === null }"
              class="tog"
              :disabled="field.state.value === null"
              @click="
                field.handleChange(
                  field.state.value?.includes(code)
                    ? field.state.value.filter((item) => item !== code)
                    : [...(field.state.value ?? []), code],
                )
              "
            >
              <UIcon
                v-if="field.state.value?.includes(code)"
                name="i-lucide-check"
                class="ic-13"
              /><span class="mono">{{ code }}</span>{{ languageName(code) }}
            </button>
          </div>
        </div>
      </form.Field>
      <form.Field v-slot="{ field }" name="expiresAt">
        <div class="field">
          <span class="label">Access ends</span>
          <label class="input" style="max-width: 260px"
            ><UIcon name="i-lucide-calendar" /><input
              type="date"
              :value="dateInput(field.state.value ?? null)"
              aria-label="Access ends"
              @input="field.handleChange(dateValue(inputValue($event)))"
          /></label>
          <span class="hint">Leave empty for ongoing access.</span>
        </div>
      </form.Field>
    </form>
    <template #footer>
      <button
        v-if="person"
        type="button"
        class="btn btn-ghost"
        style="color: var(--glot-fix)"
        :class="{ 'is-loading': remove.isPending.value }"
        @click="remove.mutate({ membershipId: person.id })"
      >
        <UIcon name="i-lucide-user-x" />Remove
      </button>
      <span class="g-grow" />
      <button type="button" class="btn btn-ghost" @click="open = false">Cancel</button>
      <button
        type="submit"
        form="person-form"
        class="btn btn-primary"
        :class="{ 'is-loading': submitting }"
      >
        <UIcon :name="person ? 'i-lucide-check' : 'i-lucide-send'" />{{
          person ? 'Save' : 'Send invite'
        }}
      </button>
    </template>
  </AppDialog>
</template>
