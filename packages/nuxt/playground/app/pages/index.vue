<script setup lang="ts">
const { t, setLocale, locale } = useI18n()
</script>

<template>
  <main style="font-family: system-ui; padding: 32px; max-width: 520px">
    <h1>Lot #4821 · Renault Master L2H2</h1>
    <p>{{ t('marketplace.itemCard.outbid') }}</p>
    <p>{{ t('marketplace.itemCard.endedOn', { date: '28/11' }) }}</p>
    <button>{{ t('actions.save') }}</button>
    <button>{{ t('actions.delete') }}</button>
    <p>
      <button @click="setLocale(locale === 'fr' ? 'pl' : 'fr')">fr / pl</button>
    </p>
  </main>
</template>
