<script setup lang="ts">
import type { Person } from '@glot/contract'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { personInviteInputSchema } from '@glot/contract/validators'
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

const state = reactive({
  email: person?.user.email ?? '',
  name: person?.user.name ?? '',
  role: person?.role ?? WORKSPACE_ROLES.WRITER,
  allLanguages: person ? person.languages === null : false,
  languages: person?.languages ?? [],
  until: person?.expiresAt ? person.expiresAt.toISOString().slice(0, 10) : '',
})

const roles = Object.values(WORKSPACE_ROLES).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
  disabled: role === WORKSPACE_ROLES.OWNER,
}))

const changes = computed(() => ({
  role: state.role,
  languages: state.allLanguages ? null : state.languages,
  expiresAt: state.until ? new Date(`${state.until}T23:59:59`) : null,
}))

const save = useMutation({
  mutationFn: () =>
    person
      ? $api.people.update.call({ membershipId: person.id, ...changes.value })
      : $api.people.invite.call({
          workspaceId,
          email: state.email,
          ...(state.name ? { name: state.name } : {}),
          ...changes.value,
        }),
  onSuccess: async (saved) => {
    await $queryClient.invalidateQueries({ queryKey: $api.people.key() })
    toast.add({
      title: person ? 'Access changed' : `Sign-in link sent to ${saved.user.email}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    open.value = false
  },
  onError: (error) => toast.add({ title: error.message, color: 'error' }),
})

const remove = useMutation({
  mutationFn: () => $api.people.remove.call({ membershipId: person?.id ?? '' }),
  onSuccess: async () => {
    await $queryClient.invalidateQueries({ queryKey: $api.people.key() })
    open.value = false
  },
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="person ? person.user.name : 'Invite someone'"
    :description="person ? person.user.email : 'They get a sign-in link by email.'"
  >
    <template #body>
      <UForm
        id="person-form"
        :schema="person ? undefined : personInviteInputSchema.pick({ email: true })"
        :state="state"
        class="flex flex-col gap-4"
        @submit="save.mutate()"
      >
        <template v-if="!person">
          <UFormField name="email" label="Email" required>
            <UInput v-model="state.email" type="email" class="w-full" autofocus />
          </UFormField>
          <UFormField name="name" label="Name">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
        </template>
        <UFormField name="role" label="Role">
          <USelect v-model="state.role" :items="roles" class="w-full" />
        </UFormField>
        <UFormField name="languages" label="Languages they change">
          <div class="flex flex-col gap-3">
            <USwitch v-model="state.allLanguages" label="Every language" />
            <UCheckboxGroup
              v-if="!state.allLanguages"
              v-model="state.languages"
              :items="languages"
              orientation="horizontal"
              variant="card"
              :ui="{ item: 'font-mono' }"
            />
          </div>
        </UFormField>
        <UFormField name="until" label="Access until" hint="Leave empty for ongoing access">
          <UInput v-model="state.until" type="date" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <UButton
        v-if="person"
        label="Remove"
        color="error"
        variant="ghost"
        :loading="remove.isPending.value"
        @click="remove.mutate()"
      />
      <span class="flex-1" />
      <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
      <UButton
        type="submit"
        form="person-form"
        color="neutral"
        :label="person ? 'Save' : 'Send invitation'"
        :loading="save.isPending.value"
      />
    </template>
  </UModal>
</template>
