<script setup lang="ts">
// Shared layout for the four tabs until their real features exist.
const props = defineProps<{ pageKey: 'encode' | 'editor' | 'algorithms' | 'knit' }>()

const { t } = useI18n()
useHead({ title: () => `${t(`pages.${props.pageKey}.title`)} · KnitBit` })
</script>

<template>
  <section class="placeholder">
    <h1>{{ $t(`pages.${pageKey}.title`) }}</h1>
    <p class="placeholder__description">
      {{ $t(`pages.${pageKey}.description`) }}
    </p>
    <p class="placeholder__soon">
      {{ $t('common.comingSoon') }}
    </p>
    <slot />
  </section>
</template>

<style scoped>
.placeholder h1 {
  margin: 0 0 var(--space-2);
  font-size: 1.75rem;
}

.placeholder__description {
  margin: 0 0 var(--space-4);
  color: var(--color-muted);
}

.placeholder__soon {
  display: inline-block;
  margin: 0;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
