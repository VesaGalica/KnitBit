<script setup lang="ts">
interface NavItem {
  to: string
  labelKey: string
  // SVG path data for a 24×24 stroke icon.
  icon: string
}

const items: NavItem[] = [
  // "0 1" – text becomes bits
  { to: '/encode', labelKey: 'nav.encode', icon: 'M4 6h4v12H4zM14 6l3-2v14M14 18h6' },
  // grid – the chart editor
  { to: '/editor', labelKey: 'nav.editor', icon: 'M4 4h16v16H4zM4 10h16M4 15h16M9 4v16M15 4v16' },
  // branching steps – algorithms
  { to: '/algorithms', labelKey: 'nav.algorithms', icon: 'M6 4v6m0 0h12m-12 0v10m12-10v10M3 20h6m6 0h6' },
  // needle and yarn – knit with me
  { to: '/knit', labelKey: 'nav.knit', icon: 'M5 19L19 5M15 5h4v4M5 19c3-1 4-4 7-4s4 3 7 2' },
]
</script>

<template>
  <nav class="bottom-nav" :aria-label="$t('nav.label')">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav__item"
      active-class="bottom-nav__item--active"
    >
      <svg
        class="bottom-nav__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path :d="item.icon" />
      </svg>
      <span class="bottom-nav__label">{{ $t(item.labelKey) }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  /* The bar itself is --nav-height tall; the extra bottom padding sits
     above the iPhone home indicator. */
  padding: 0 var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.bottom-nav__item {
  height: var(--nav-height);
  /* Apple's minimum touch target is 44×44 pt. */
  min-width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.6875rem;
  font-weight: 500;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav__item--active {
  color: var(--color-accent);
}

.bottom-nav__icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
