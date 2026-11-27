<script setup lang="ts">
const { workspace } = useCurrentWorkspace()
const { managesPeople } = useAccess()

const workspaceId = computed(() => workspace.value?.id ?? '')
</script>

<template>
  <AppPage title="Settings" scroll>
    <SettingsTabs />
    <div v-if="workspace" class="set-grid">
      <div class="stack" style="gap: 12px">
        <WorkspaceDetails
          :workspace-id="workspaceId"
          :name="workspace.name"
          :editable="managesPeople"
        />
        <MyEmailsPanel />
        <MonthlyReportPanel v-if="managesPeople" :workspace-id="workspaceId" />
      </div>
      <div class="stack" style="gap: 12px">
        <WorkspaceLanguages :workspace-id="workspaceId" />
      </div>
    </div>
  </AppPage>
</template>
