import { defineStore } from 'pinia'

export interface DashboardData {
  quota_total: number
  quota_used: number
  approved_hours: number
  pending_hours: number
  not_submitted_hours: number
  balance_hours: number
  monthly: Array<{
    month: string
    hours: number
    log_count: number
  }>
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    data: null as DashboardData | null,
    lastSemesterId: null as number | null,
  }),
  getters: {
    quotaPercent: (state) => {
      if (!state.data) return 0
      return Math.min(100, Math.round((state.data.quota_used / state.data.quota_total) * 100))
    },
  },
  actions: {
    set(data: DashboardData, semesterId: number) {
      this.data = data
      this.lastSemesterId = semesterId
    },
    clear() {
      this.data = null
      this.lastSemesterId = null
    },
  },
})
