<template>
  <div class="grid h-dvh grid-cols-[216px_1fr]">
    <aside class="flex flex-col gap-0.5 px-3 py-[18px]">
      <div class="flex items-center gap-2.5 px-2 pb-4">
        <span
          class="grid size-[26px] place-items-center rounded-lg bg-ink text-[13px] font-semibold text-bg"
          >g</span
        >
        <span class="text-[13.5px] font-semibold">Glot</span>
      </div>
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] font-medium text-ink-2 no-underline [&.router-link-active]:bg-surface [&.router-link-active]:text-ink [&.router-link-active]:shadow-card"
      >
        Texts
      </NuxtLink>
    </aside>
    <main class="min-h-0 min-w-0 py-3 pr-3">
      <div class="flex h-full flex-col overflow-hidden rounded-panel bg-surface shadow-card">
        <slot />
      </div>
    </main>
  </div>
</template>
