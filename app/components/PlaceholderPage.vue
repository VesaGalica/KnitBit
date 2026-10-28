<script setup lang="ts">
// Shared layout for the tabs whose real features do not exist yet.
const props = defineProps<{ title: string, description: string }>()

useHead({ title: () => `${props.title} · KnitBit` })
</script>

<template>
  <section class="placeholder">
    <h1>{{ title }}</h1>
    <p class="placeholder__description">
      {{ description }}
    </p>
    <p class="placeholder__soon">
      Coming soon
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
