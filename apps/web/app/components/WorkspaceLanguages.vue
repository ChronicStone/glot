<script setup lang="ts">
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { useQuery } from '@tanstack/vue-query'

const { workspaceId } = defineProps<{ workspaceId: string }>()

const { $api } = useNuxtApp()
const { projects } = useCurrentProject()
const languages = useWorkspaceLanguages()
const people = useQuery($api.people.list.queryOptions({ input: { workspaceId } }))

const bases = computed(() => new Set(projects.value.map(({ sourceLanguage }) => sourceLanguage)))

const rows = computed(() =>
  languages.value.map((language) => ({
    language,
    base: bases.value.has(language),
    reviewers: (people.data.value ?? []).filter(
      (person) =>
        person.role === WORKSPACE_ROLES.REVIEWER && (person.languages?.includes(language) ?? false),
    ),
  })),
)
</script>

<template>
  <section class="panel">
    <div class="panel-h">
      <h3>Languages</h3>
      <span class="meta">who approves each one</span>
    </div>
    <div class="rows" style="padding: 8px 24px 14px">
      <div v-for="row in rows" :key="row.language" class="r" style="padding: 10px 0">
        <span :class="row.base ? 'base' : 'plain'" class="lc">{{ row.language }}</span>
        <span class="grow"
          >{{ languageName(row.language) }}
          <span v-if="row.base" class="muted" style="font-size: 12px">· written by writers</span>
          <span v-else-if="row.reviewers.length === 1" class="muted" style="font-size: 12px"
            >· one reviewer: own edits are self-approved</span
          ></span
        >
        <span v-if="row.reviewers.length > 0" class="av-stack"
          ><AppAvatar
            v-for="person in row.reviewers"
            :key="person.id"
            :name="person.user.name"
            size="sm"
        /></span>
        <span v-else-if="!row.base" class="pill miss"
          ><UIcon name="i-lucide-circle-dashed" />No reviewer · owners and admins approve</span
        >
      </div>
      <p v-if="rows.length === 0" class="muted" style="font-size: 13px; margin: 6px 0">
        Languages appear once a project names them.
      </p>
    </div>
  </section>
</template>
