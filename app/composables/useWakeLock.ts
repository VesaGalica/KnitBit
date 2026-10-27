/**
 * Keeps the screen on while the user knits (used by the knit tab).
 *
 * Uses the Screen Wake Lock API. Where it is not available (older iOS,
 * some in-app browsers) every method is a safe no-op and `isSupported`
 * is false, so the UI can tell the user to keep the screen on manually.
 */
export function useWakeLock() {
  const isSupported = ref(false)
  const isActive = ref(false)

  // The browser releases the lock on its own when the page is hidden
  // (switching apps, locking the phone). `wanted` remembers that the user
  // asked for it, so we can take it again when the page becomes visible.
  let wanted = false
  let sentinel: WakeLockSentinel | null = null
  // While a request is in flight, further calls wait for the same one
  // instead of asking the browser for a second lock.
  let pending: Promise<boolean> | null = null

  function request(): Promise<boolean> {
    wanted = true
    if (!isSupported.value) return Promise.resolve(false)
    if (sentinel) return Promise.resolve(true)
    pending ??= acquire().finally(() => {
      pending = null
    })
    return pending
  }

  async function acquire(): Promise<boolean> {
    try {
      const lock = await navigator.wakeLock.request('screen')
      lock.addEventListener('release', () => {
        if (sentinel === lock) sentinel = null
        isActive.value = sentinel !== null
      })
      sentinel = lock
      isActive.value = true
      return true
    }
    catch {
      // Refused, e.g. low battery mode or the page is not visible.
      isActive.value = false
      return false
    }
  }

  async function release(): Promise<void> {
    wanted = false
    if (!sentinel) return
    await sentinel.release()
    sentinel = null
    isActive.value = false
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && wanted && !sentinel) {
      void request()
    }
  }

  onMounted(() => {
    isSupported.value = typeof navigator !== 'undefined' && 'wakeLock' in navigator
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void release()
  })

  return {
    isSupported: readonly(isSupported),
    isActive: readonly(isActive),
    request,
    release,
  }
}
