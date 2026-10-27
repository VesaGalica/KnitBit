<template>
  <div class="shell">
    <main class="shell__content">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.shell__content {
  flex: 1;
  /* Top padding clears the notch / status bar (black-translucent draws under it).
     Bottom padding leaves room for the fixed navigation bar and the home indicator. */
  padding:
    calc(var(--safe-top) + var(--space-4))
    calc(var(--safe-right) + var(--space-4))
    calc(var(--nav-height) + var(--safe-bottom) + var(--space-4))
    calc(var(--safe-left) + var(--space-4));
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
}
</style>
