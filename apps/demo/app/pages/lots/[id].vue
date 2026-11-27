<script setup lang="ts">
import { LOTS } from '~/constants/lots.constants'

const route = useRoute()
const { t, n, d } = useI18n()
const localePath = useLocalePath()
const lot = Object.values(LOTS).find((entry) => String(entry.id) === route.params.id)

if (!lot) {
  throw createError({ statusCode: 404 })
}

const ends = new Date(lot.endsAt)

function euros(value: number) {
  return n(value, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

useHead({ title: () => t('seo.lotTitle', { title: lot.title }) })
</script>

<template>
  <main class="page">
    <div class="crumb">
      <NuxtLink :to="localePath('/')">{{ t('nav.auctions') }}</NuxtLink> ›
      {{ t('marketplace.lot.vehicles') }} › {{ t('marketplace.lot.vans') }}
    </div>
    <div class="lot">
      <div class="photo" :style="{ background: `linear-gradient(160deg, #d3d7de, ${lot.tone})` }" />
      <div>
        <h1>{{ lot.title }}</h1>
        <div class="kv">
          <div>
            <span>{{ t('marketplace.lot.startingPrice') }}</span
            ><b>{{ euros(lot.startingPrice) }}</b>
          </div>
          <div>
            <span>{{ t('marketplace.lot.highestBid') }}</span><b>{{ euros(lot.highestBid) }}</b>
          </div>
          <div>
            <span>{{
              t('marketplace.lot.endsAt', {
                date: d(ends, { day: '2-digit', month: '2-digit' }),
                time: d(ends, { hour: '2-digit', minute: '2-digit' }),
              })
            }}</span
            ><b>2 d 3 h</b>
          </div>
        </div>
        <BidPanel :minimum="lot.highestBid + lot.step" :fees="lot.fees" />
      </div>
    </div>
  </main>
</template>
