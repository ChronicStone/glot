<script setup lang="ts">
const { t, setLocale, locale } = useI18n()
</script>

<template>
  <main style="font-family: system-ui; padding: 32px; max-width: 520px">
    <h1>Lot #4821 · Art deco armchair</h1>
    <p>{{ t('lotCard.outbid') }}</p>
    <p>{{ t('lotCard.endedOn', { date: '28/11' }) }}</p>
    <button>{{ t('actions.save') }}</button>
    <button>{{ t('actions.delete') }}</button>
    <p>
      <button @click="setLocale(locale === 'fr' ? 'pl' : 'fr')">fr / pl</button>
    </p>
  </main>
</template>
