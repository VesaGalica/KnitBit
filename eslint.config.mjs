// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // The core layer must stay framework-free (thesis chapter 5.3).
  },
}).append({
  files: ['core/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['vue', 'vue/*', '#app', '#imports', 'nuxt', 'nuxt/*', 'pinia', '@pinia/*'], message: 'core/ must not depend on Vue, Nuxt or Pinia.' },
      ],
    }],
  },
})
