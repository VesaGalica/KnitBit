<script setup lang="ts">
/**
 * Shows a decoded text with control characters as dimmed symbols
 * (see visibleSegments in app/utils/visibleText.ts), so bytes like 0 are
 * visible but do not look like letters. Used inside a `.result` paragraph,
 * which keeps spaces and line breaks.
 */
const props = defineProps<{ text: string }>()

const segments = computed(() => visibleSegments(props.text))
</script>

<template>
  <span
    v-for="(segment, i) in segments"
    :key="i"
    :class="{ 'control': segment.control }"
    :title="segment.control ? 'Control character, not a letter' : undefined"
    :data-test="segment.control ? 'control-char' : undefined"
  >{{ segment.text }}</span>
</template>

<style scoped>
/* Dimmed and not bold, so control pictures (␀, which some fonts draw as tiny
   "NUL" letters) are clearly not part of the readable text. */
.control {
  color: var(--color-muted);
  font-weight: 400;
  opacity: 0.6;
}
</style>
