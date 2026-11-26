<template>
  <main class="grid min-h-dvh place-items-center p-4">
    <UCard
      class="w-full max-w-sm"
      :ui="{ root: 'rounded-card shadow-card ring-0', body: 'sm:p-6' }"
    >
      <slot />
    </UCard>
  </main>
</template>
