interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

const toasts = useState<Toast[]>('toasts', () => [])

export function useToast() {
  function show(type: Toast['type'], message: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, type, message })
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }

  function dismiss(id: string) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    success: (msg: string) => show('success', msg),
    error: (msg: string) => show('error', msg),
    info: (msg: string) => show('info', msg),
  }
}
