import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const auth = useAuthStore()
  const config = useRuntimeConfig()
  const router = useRouter()
  const toast = useToast()

  const baseUrl = config.public.apiBaseUrl

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

    const data = await res.json()
    if (!res.ok) {
      throw Object.assign(new Error(data.error ?? 'Request failed'), { code: data.error, status: res.status })
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
      if (data.data?.access_token && data.data?.user) {
        auth.setAuth(data.data.access_token, data.data.user)
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
