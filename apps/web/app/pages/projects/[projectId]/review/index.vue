<script setup lang="ts">
const { project } = useCurrentProject()
const { approve } = useRights()

watch(
  [project, approve],
  ([current, languages]) => {
    const first = languages[0]

    if (current && first) {
      navigateTo(`/projects/${current.id}/review/${first}`, { replace: true })
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppPage title="Review">
    <div class="panel">
      <div class="empty">
        <span class="ico-tile"><UIcon name="i-lucide-list-checks" /></span>
        <div class="h3">You do not review a language of this project</div>
        <p>
          Reviewers approve the texts of their languages. An admin can add you to a language in
          Settings.
        </p>
      </div>
    </div>
  </AppPage>
</template>
