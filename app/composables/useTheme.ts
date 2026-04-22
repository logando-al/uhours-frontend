type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'uhours-theme'
const EXPLICIT_STORAGE_KEY = 'uhours-theme-explicit'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'system')
  let mediaQuery: MediaQueryList | null = null
  let systemListener: ((e: MediaQueryListEvent) => void) | null = null

  function applyTheme(value: Theme) {
    if (!import.meta.client) return
    const html = document.documentElement
    if (value === 'light') {
      html.setAttribute('data-theme', 'light')
    } else if (value === 'dark') {
      html.removeAttribute('data-theme')
    } else {
      // system — follow OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      prefersDark ? html.removeAttribute('data-theme') : html.setAttribute('data-theme', 'light')
    }
  }

  function applyStoredTheme(value: Theme) {
    theme.value = value
    applyTheme(value)

    // Remove old system listener
    if (mediaQuery && systemListener) {
      mediaQuery.removeEventListener('change', systemListener)
      systemListener = null
    }

    // Attach system listener if needed
    if (value === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemListener = (e: MediaQueryListEvent) => {
        e.matches ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', 'light')
      }
      mediaQuery.addEventListener('change', systemListener)
    }
  }

  function setTheme(value: Theme) {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, value)
    localStorage.setItem(EXPLICIT_STORAGE_KEY, 'true')
    applyStoredTheme(value)
  }

  function init() {
    if (!import.meta.client) return
    const hasExplicitPreference = localStorage.getItem(EXPLICIT_STORAGE_KEY) === 'true'
    const stored = localStorage.getItem(STORAGE_KEY)

    if (hasExplicitPreference && (stored === 'dark' || stored === 'light' || stored === 'system')) {
      applyStoredTheme(stored)
      return
    }

    // Default behavior follows the OS theme until the user explicitly chooses one.
    localStorage.removeItem(EXPLICIT_STORAGE_KEY)
    applyStoredTheme('system')
  }

  return { theme: readonly(theme), setTheme, init }
}
