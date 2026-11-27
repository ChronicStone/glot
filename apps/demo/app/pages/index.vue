<script setup lang="ts">
import { LOTS } from '~/constants/lots.constants'

const { t, n } = useI18n()
const localePath = useLocalePath()
const lots = Object.values(LOTS)
</script>

<template>
  <main class="page">
    <h1>{{ t('marketplace.list.title') }}</h1>
    <p class="crumb">{{ t('marketplace.list.count', lots.length) }}</p>
    <div class="grid">
      <NuxtLink v-for="lot in lots" :key="lot.id" :to="localePath(`/lots/${lot.id}`)" class="card">
        <div
          class="photo"
          :style="{ background: `linear-gradient(160deg, #d3d7de, ${lot.tone})` }"
        />
        <h2>{{ lot.title }}</h2>
        <p>
          {{ t('marketplace.lot.highestBid') }} ·
          <b>{{
            n(lot.highestBid, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
          }}</b>
        </p>
        <p>{{ t('marketplace.list.endsIn', { time: '2 d 3 h' }) }}</p>
      </NuxtLink>
    </div>
  </main>
</template>
