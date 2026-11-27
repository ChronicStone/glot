<script setup lang="ts">
import { useMutation, useQuery } from '@tanstack/vue-query'

const { $api, $queryClient } = useNuxtApp()
const toast = useToast()
const preferences = useQuery($api.people.preferences.queryOptions())

const update = useMutation(
  $api.people.updatePreferences.mutationOptions({
    onSuccess: async (saved) => {
      await $queryClient.invalidateQueries({ queryKey: $api.people.preferences.key() })
      toast.add({
        title: saved.receivesDigest ? 'Daily email on' : 'Daily email off',
        color: 'success',
        icon: 'i-lucide-check',
      })
    },
    onError: (error) => {
      toast.add({ title: error.message, color: 'error', icon: 'i-lucide-circle-alert' })
    },
  }),
)

const on = computed(() => preferences.data.value?.receivesDigest ?? false)
</script>

<template>
  <section class="panel">
    <div class="panel-h"><h3>Your emails</h3></div>
    <div class="rows" style="padding: 8px 24px 14px">
      <div class="r">
        <span class="ico-tile"><UIcon name="i-lucide-mail" /></span>
        <div class="grow">
          <div id="daily-email" class="r-title">Daily email of what needs you</div>
          <div class="r-sub">Sent at 07:00 UTC, only on days something waits for you.</div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="on"
          aria-labelledby="daily-email"
          :disabled="!preferences.data.value || update.isPending.value"
          :class="{ on }"
          class="switch"
          @click="update.mutate({ receivesDigest: !on })"
        />
      </div>
    </div>
  </section>
</template>
