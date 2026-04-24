// Module-level cache — fetched once per session, shared across all pages
let _promise: Promise<string[]> | null = null
const _cache = ref<string[]>([])

export function useActivities() {
  const { apiFetch } = useAuth()

  async function loadActivities(): Promise<string[]> {
    if (_cache.value.length) return _cache.value
    if (!_promise) {
      _promise = apiFetch<string[]>('/config/activities').then(data => {
        _cache.value = data ?? []
        return _cache.value
      })
    }
    return _promise
  }

  return { activities: _cache, loadActivities }
}
