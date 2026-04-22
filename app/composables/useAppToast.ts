import { useToast } from 'primevue/usetoast'

export function useAppToast() {
  const toast = useToast()

  return {
    success: (msg: string) => toast.add({ severity: 'success', summary: 'Success', detail: msg, life: 4000 }),
    error: (msg: string) => toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 }),
    info: (msg: string) => toast.add({ severity: 'info', summary: 'Info', detail: msg, life: 4000 }),
  }
}
