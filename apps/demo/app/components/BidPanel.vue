<script setup lang="ts">
const { minimum, fees } = defineProps<{ minimum: number; fees: number }>()
const { t, n } = useI18n()
const amount = ref<string>(String(minimum))

function euros(value: number) {
  return n(value, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}
</script>

<template>
  <section class="bid">
    <div>{{ t('marketplace.bid.nextMinimum', { amount: euros(minimum) }) }}</div>
    <form class="bid-row" @submit.prevent>
      <input
        v-model="amount"
        inputmode="numeric"
        :aria-label="t('marketplace.bid.yourBid')"
        :placeholder="t('marketplace.bid.yourBid')"
      />
      <button type="submit">{{ t('marketplace.bid.placeBid') }}</button>
    </form>
    <UModal :title="t('marketplace.lot.requestViewing')" data-demo="viewing">
      <button type="button" class="secondary">{{ t('marketplace.lot.requestViewing') }}</button>
      <template #body>
        <form class="viewing" @submit.prevent>
          <UInput
            :placeholder="t('marketplace.bid.yourBid')"
            :aria-label="t('marketplace.bid.yourBid')"
          />
          <UButton type="submit">{{ t('actions.save') }}</UButton>
        </form>
      </template>
    </UModal>
    <div class="fee">{{ t('marketplace.bid.fees', { amount: euros(fees) }) }}</div>
  </section>
</template>
