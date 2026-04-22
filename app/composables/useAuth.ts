import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const auth = useAuthStore()
  const config = useRuntimeConfig()
  const router = useRouter()

  const baseUrl = config.public.apiBaseUrl

  function parseBody(text: string) {
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(auth.authHeader ? { Authorization: auth.authHeader } : {}),
        ...options?.headers,
      },
    })

    // Silent refresh on 401
    if (res.status === 401) {
      const refreshed = await tryRefresh()
      if (refreshed) {
        return apiFetch<T>(path, options)
      }
      auth.clearAuth()
      router.push('/')
      throw new Error('Session expired')
    }

    const text = await res.text()
    const data = parseBody(text)

    if (!res.ok) {
      const error = data?.error
      throw Object.assign(new Error(error?.message ?? 'Request failed'), {
        code: error?.code,
        status: res.status,
      })
    }

    if (res.status === 204 || !data) {
      return null
    }

    return data.data ?? data
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data.data?.access_token) {
        auth.updateAccessToken(data.data.access_token)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async function login(username: string, password: string, turnstileToken: string) {
    const data = await apiFetch<{ access_token: string; user: { id: number; username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, turnstile_token: turnstileToken }),
    })
    auth.setAuth(data.access_token, data.user)
    router.push('/dashboard')
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      auth.clearAuth()
      router.push('/')
    }
  }

  return { auth, apiFetch, login, logout }
}
