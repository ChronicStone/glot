<script setup lang="ts">
import { signInSchema } from '@glot/auth/validators/sign-in'
import GlotMark from '@glot/ui/components/GlotMark.vue'
import { useForm } from '@tanstack/vue-form'

definePageMeta({ layout: 'auth' })

const sent = ref<string>('')
const { $auth } = useNuxtApp()

const form = useForm({
  defaultValues: { email: '' },
  validators: { onSubmit: signInSchema },
  onSubmit: async ({ value }) => {
    await $auth.signIn.magicLink({ email: value.email, callbackURL: '/' })
    sent.value = value.email
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)
</script>

<template>
  <div class="auth">
    <div v-if="sent" class="auth-in" style="align-items: center; text-align: center">
      <span class="sent-ill"><UIcon name="i-lucide-mail-check" /></span>
      <h1>Check your inbox</h1>
      <div class="sub">
        We sent a sign-in link to<br /><b style="color: var(--glot-ink); font-weight: 500">{{
          sent
        }}</b>
      </div>
      <div class="note" style="margin-top: 20px">The link works once.</div>
      <div class="row-flex" style="margin-top: 20px">
        <button type="button" class="btn btn-ghost btn-sm" @click="sent = ''">
          Use another email
        </button>
      </div>
    </div>
    <form v-else class="auth-in" @submit.prevent.stop="form.handleSubmit()">
      <span class="mark"><GlotMark /></span>
      <div class="auth-strip">
        <span class="lc base">fr</span><span class="lc ok">en</span><span class="lc ok">de</span
        ><span class="lc check">pl</span><span class="lc ok">nl</span>
      </div>
      <h1>Sign in to Glot</h1>
      <div class="sub">Write, translate and review every word of the apps and emails.</div>
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
      <div class="note">Use the email your invitation was sent to.</div>
    </form>
    <div class="auth-foot">Glot</div>
  </div>
</template>
