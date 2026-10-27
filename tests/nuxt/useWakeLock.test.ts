import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { useWakeLock } from '../../app/composables/useWakeLock'

const mounted: Array<{ unmount: () => void }> = []

/** Mounts a tiny component so the composable's lifecycle hooks run. */
async function mountWakeLock() {
  let api!: ReturnType<typeof useWakeLock>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      api = useWakeLock()
      return () => h('div')
    },
  }))
  mounted.push(wrapper)
  return { api, wrapper }
}

/** A fake WakeLockSentinel that can fire its "release" event. */
function fakeSentinel() {
  const listeners: Array<() => void> = []
  return {
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    release: vi.fn(async () => {
      listeners.forEach(fn => fn())
    }),
    fireRelease: () => listeners.forEach(fn => fn()),
  }
}

afterEach(() => {
  // Unmount so a previous test's visibilitychange listener cannot react.
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  // happy-dom may not define wakeLock; remove any stub we added.
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('falls back quietly when the Wake Lock API is missing', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock')
    const { api } = await mountWakeLock()

    expect(api.isSupported.value).toBe(false)
    expect(await api.request()).toBe(false)
    expect(api.isActive.value).toBe(false)
    await expect(api.release()).resolves.toBeUndefined()
  })

  it('requests and releases the screen lock', async () => {
    const sentinel = fakeSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

    const { api } = await mountWakeLock()
    expect(api.isSupported.value).toBe(true)

    expect(await api.request()).toBe(true)
    expect(request).toHaveBeenCalledWith('screen')
    expect(api.isActive.value).toBe(true)

    await api.release()
    expect(sentinel.release).toHaveBeenCalled()
    expect(api.isActive.value).toBe(false)
  })

  it('reports inactive when the browser refuses the lock', async () => {
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

    const { api } = await mountWakeLock()
    expect(await api.request()).toBe(false)
    expect(api.isActive.value).toBe(false)
  })

  it('takes the lock again when the page becomes visible', async () => {
    const first = fakeSentinel()
    const second = fakeSentinel()
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

    const { api } = await mountWakeLock()
    await api.request()

    // The browser drops the lock when the user switches apps...
    first.fireRelease()
    expect(api.isActive.value).toBe(false)

    // ...and the composable asks for it again on return.
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(api.isActive.value).toBe(true)
  })
})
