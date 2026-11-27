<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'

const { $api } = useNuxtApp()
const { workspace } = useCurrentWorkspace()
const { access, managesPeople } = useAccess()

const workspaceId = computed(() => workspace.value?.id ?? '')

const settings = useQuery(() => ({
  ...$api.ai.settings.queryOptions({ input: { workspaceId: workspaceId.value } }),
  enabled: Boolean(workspaceId.value) && managesPeople.value,
}))

const usage = useQuery(() => ({
  ...$api.ai.usage.queryOptions({ input: { workspaceId: workspaceId.value } }),
  enabled: Boolean(workspaceId.value) && managesPeople.value,
}))
</script>

<template>
  <AppPage title="Settings" scroll>
    <SettingsTabs />
    <section v-if="access.data.value && !managesPeople" class="panel">
      <div class="empty">
        <span class="ico-tile"><UIcon name="i-lucide-sparkle" /></span>
        <div class="h3">Owners and admins set up AI</div>
        <p>They choose the provider, its key and the monthly budget.</p>
      </div>
    </section>
    <div v-else class="set-grid">
      <AiUsagePanel v-if="usage.data.value" :usage="usage.data.value" />
      <section v-else class="panel panel-pad">
        <div class="sk" style="height: 14px; width: 30%" />
        <div class="sk" style="height: 132px; margin-top: 22px" />
      </section>
      <AiProviderPanel
        v-if="settings.data.value"
        :workspace-id="workspaceId"
        :settings="settings.data.value"
      />
      <section v-else class="panel panel-pad">
        <div class="sk" style="height: 14px; width: 40%" />
        <div class="sk" style="height: 90px; margin-top: 16px" />
      </section>
    </div>
  </AppPage>
</template>
