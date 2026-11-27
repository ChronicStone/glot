<script setup lang="ts">
const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

async function change(event: Event) {
  const code = event.target instanceof HTMLSelectElement ? event.target.value : locale.value

  await navigateTo(switchLocalePath(code))
}
</script>

<template>
  <UApp>
    <header class="nav">
      <NuxtLink :to="localePath('/')" class="logo"><i />agorastore</NuxtLink>
      <NuxtLink :to="localePath('/')">{{ t('nav.auctions') }}</NuxtLink>
      <span class="wide">{{ t('nav.categories') }}</span>
      <span class="wide">{{ t('nav.howItWorks') }}</span>
      <select :value="locale" aria-label="Language" @change="change">
        <option v-for="entry in locales" :key="entry.code" :value="entry.code">
          {{ entry.code }}
        </option>
      </select>
    </header>
    <NuxtPage />
  </UApp>
</template>
