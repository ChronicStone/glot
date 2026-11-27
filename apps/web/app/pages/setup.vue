<script setup lang="ts">
import { setupCompleteSchema } from '@glot/auth/validators/setup'
import GlotMark from '@glot/ui/components/GlotMark.vue'
import { useForm } from '@tanstack/vue-form'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const { $auth } = useNuxtApp()
const token = computed<string>(() => String(route.query.token ?? ''))
const open = ref<boolean | undefined>(undefined)
const message = ref<string>('')

const fields = [
  { name: 'workspaceName', label: 'Workspace name', type: 'text', autocomplete: 'organization' },
  { name: 'name', label: 'Your name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
] as const

const form = useForm({
  defaultValues: { workspaceName: '', name: '', email: '' },
  validators: { onSubmit: setupCompleteSchema.omit({ token: true }) },
  onSubmit: async ({ value }) => {
    message.value = ''

    const { error } = await $auth.setup.complete({ token: token.value, ...value })

    if (error) {
      message.value = error.message ?? ''

      return
    }

    await navigateTo('/', { external: true })
  },
})

const submitting = form.useSelector((state) => state.isSubmitting)

onMounted(async () => {
  const { data } = await $auth.setup.status()
  open.value = Boolean(data?.open) && token.value !== ''
})
</script>

<template>
  <div class="setup">
    <aside class="setup-side">
      <span class="mark"><GlotMark /></span>
      <h1>Set up Glot</h1>
      <div class="sub">A minute. You can change everything later in Settings.</div>
      <div class="steps">
        <div class="step now">
          <span class="c">1</span>
          <div>
            <div class="t">Create the first admin</div>
            <div class="d">You own the new workspace</div>
          </div>
        </div>
        <div class="step">
          <span class="c">2</span>
          <div>
            <div class="t">Add a project</div>
            <div class="d">A repository and where its language files are</div>
          </div>
        </div>
        <div class="step">
          <span class="c">3</span>
          <div>
            <div class="t">Invite people</div>
            <div class="d">Writers, reviewers, developers</div>
          </div>
        </div>
      </div>
      <div class="muted" style="margin-top: auto; font-size: 12px">
        Setup link from the server logs
      </div>
    </aside>
    <section class="panel setup-main">
      <div v-if="open === false" class="empty" style="flex: 1; justify-content: center">
        <span class="ico-tile fix"><UIcon name="i-lucide-link-2-off" /></span>
        <div class="h3">This setup link is not valid anymore</div>
        <p>Setup is open only until the first admin exists. Ask them to invite you.</p>
        <div class="row-flex">
          <NuxtLink to="/sign-in" class="btn btn-primary btn-sm">Go to sign in</NuxtLink>
        </div>
      </div>
      <form
        novalidate
        v-else
        id="setup-form"
        class="body"
        @submit.prevent.stop="form.handleSubmit()"
      >
        <div>
          <h2>Create the first admin</h2>
          <div class="muted" style="margin-top: 4px">
            You become the owner of the workspace and are signed in.
          </div>
        </div>
        <form.Field v-for="input in fields" :key="input.name" v-slot="{ field }" :name="input.name">
          <div class="field" style="max-width: 420px">
            <span class="label">{{ input.label }}</span>
            <label :class="{ 'is-error': field.state.meta.errors.length > 0 }" class="input"
              ><input
                :value="field.state.value"
                :type="input.type"
                :autocomplete="input.autocomplete"
                :aria-label="input.label"
                @input="field.handleChange(inputValue($event))"
                @blur="field.handleBlur"
            /></label>
            <span v-if="errorMessage(field.state.meta.errors)" class="hint err">{{
              errorMessage(field.state.meta.errors)
            }}</span>
          </div>
        </form.Field>
        <div v-if="message" class="banner fix">
          <UIcon name="i-lucide-triangle-alert" /><span>{{ message }}</span>
        </div>
      </form>
      <div v-if="open !== false" class="insp-foot" style="padding: 14px 20px">
        <span class="g-grow" />
        <button
          type="submit"
          form="setup-form"
          class="btn btn-primary"
          :class="{ 'is-loading': submitting }"
        >
          Create the admin<UIcon name="i-lucide-arrow-right" />
        </button>
      </div>
    </section>
  </div>
</template>
