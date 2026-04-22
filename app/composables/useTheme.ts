type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'uhours-theme'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'dark')
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

  function setTheme(value: Theme) {
    theme.value = value
    localStorage.setItem(STORAGE_KEY, value)
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

  function init() {
    if (!import.meta.client) return
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'dark'
    setTheme(stored)
  }

  return { theme: readonly(theme), setTheme, init }
}
