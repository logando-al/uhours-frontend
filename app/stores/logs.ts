import { defineStore } from 'pinia'

export interface LogEntry {
  id: number
  date: string
  activity: string
  hours: number
  start_time: string
  end_time: string
  lecturer: string
  notes: string
  claim_status: string
  approval_status: string
  subject_id?: number
  subject_name?: string
  semester_id: number
}

export const useLogsStore = defineStore('logs', {
  state: () => ({
    list: [] as LogEntry[],
    lastSemesterId: null as number | null,
  }),
  actions: {
    set(logs: LogEntry[], semesterId: number) {
      this.list = logs
      this.lastSemesterId = semesterId
    },
    add(log: LogEntry) {
      this.list.unshift(log)
    },
    update(log: LogEntry) {
      const idx = this.list.findIndex(l => l.id === log.id)
      if (idx !== -1) this.list[idx] = log
    },
    remove(id: number) {
      this.list = this.list.filter(l => l.id !== id)
    },
  },
})
