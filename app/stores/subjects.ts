import { defineStore } from 'pinia'

export interface Subject {
  id: number
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer: string
  semester_id: number
}

export const useSubjectsStore = defineStore('subjects', {
  state: () => ({
    list: [] as Subject[],
    loaded: false,
  }),
  getters: {
    options: (state) => state.list.map(s => ({
      value: s.id,
      label: `${s.name} (${s.day_of_week})`,
    })),
  },
  actions: {
    set(subjects: Subject[]) {
      this.list = subjects
      this.loaded = true
    },
    add(subject: Subject) {
      this.list.push(subject)
    },
    update(subject: Subject) {
      const idx = this.list.findIndex(s => s.id === subject.id)
      if (idx !== -1) this.list[idx] = subject
    },
    remove(id: number) {
      this.list = this.list.filter(s => s.id !== id)
    },
  },
})
