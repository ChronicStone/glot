<script setup lang="ts">
import { signInSchema } from '@glot/auth/validators/sign-in'
import GlotMark from '@glot/ui/components/GlotMark.vue'
import { useForm } from '@tanstack/vue-form'
import { useMutation } from '@tanstack/vue-query'
import { useIntervalFn } from '@vueuse/core'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { $api, $auth } = useNuxtApp()
const sent = ref<string>('')
const refused = ref<string>('')

const request = computed(() => ({
  origin: String(route.query.origin ?? ''),
  repository: String(route.query.project ?? ''),
  state: String(route.query.state ?? ''),
}))

const token = useMutation(
  $api.widget.token.mutationOptions({
    onSuccess: (session) =>
      reply({ session: { ...session, expiresAt: session.expiresAt.toISOString() } }),
    onError: () => {
      refused.value = `You are not a member of ${request.value.repository}, or this app cannot use Glot.`
      reply({ error: 'No access to this project' })
    },
  }),
)

function reply(payload: Record<string, unknown>) {
  const opener: Window | null = window.opener

  if (opener && request.value.origin) {
    opener.postMessage({ state: request.value.state, ...payload }, request.value.origin)
  }

  if ('session' in payload) {
    window.close()
  }
}

async function continueIfSignedIn() {
  const { data } = await $auth.getSession()

  if (data && !token.isPending.value && !token.isSuccess.value && !refused.value) {
    pause()
    token.mutate({ origin: request.value.origin, repository: request.value.repository })
  }
}

const { pause } = useIntervalFn(continueIfSignedIn, 2000, { immediateCallback: true })

const form = useForm({
  defaultValues: { email: '' },
  validators: { onSubmit: signInSchema },
  onSubmit: async ({ value }) => {
    await $auth.signIn.magicLink({ email: value.email, callbackURL: route.fullPath })
    sent.value = value.email
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)
</script>

<template>
  <div class="auth">
    <div v-if="refused" class="auth-in" style="align-items: center; text-align: center">
      <h1>No access</h1>
      <div class="sub">{{ refused }}</div>
    </div>
    <div v-else-if="token.isPending.value || token.isSuccess.value" class="auth-in">
      <span class="mark"><GlotMark /></span>
      <h1>Signing you in</h1>
      <div class="sub">This window closes by itself.</div>
    </div>
    <div v-else-if="sent" class="auth-in" style="align-items: center; text-align: center">
      <span class="sent-ill"><UIcon name="i-lucide-mail-check" /></span>
      <h1>Check your inbox</h1>
      <div class="sub">
        Open the link we sent to<br /><b style="color: var(--glot-ink); font-weight: 500">{{
          sent
        }}</b
        ><br />in any tab. This window goes on by itself.
      </div>
    </div>
    <form v-else class="auth-in" @submit.prevent.stop="form.handleSubmit()">
      <span class="mark"><GlotMark /></span>
      <h1>Sign in to Glot</h1>
      <div class="sub">To edit the texts of {{ request.repository }} in this app.</div>
      <form.Field v-slot="{ field }" name="email">
        <div class="field" style="margin-top: 28px">
          <span class="label">Email</span>
          <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input input-lg"
            ><UIcon name="i-lucide-at-sign" /><input
              :value="field.state.value"
              type="email"
              placeholder="you@company.com"
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
      <button
        type="submit"
        class="btn btn-primary btn-lg"
        style="margin-top: 10px; width: 100%"
        :class="{ 'is-loading': submitting }"
      >
        Email me a sign-in link
      </button>
    </form>
    <div class="auth-foot">Glot</div>
  </div>
</template>
