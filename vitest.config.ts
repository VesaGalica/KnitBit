import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        // core/ is plain TypeScript, so its tests run in plain Node: fast,
        // and proof that the layer does not depend on Vue or Nuxt.
        test: {
          name: 'core',
          include: ['tests/core/**/*.test.ts'],
          environment: 'node',
        },
      },
      // Composables and components need the Nuxt runtime (auto-imports, ref, ...).
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
              // The PWA client plugin imports a virtual module that only exists
              // in a real Vite build, so it is switched off for tests.
              overrides: {
                pwa: { disable: true, client: { registerPlugin: false } },
              },
            },
          },
        },
      }),
    ],
  },
})
