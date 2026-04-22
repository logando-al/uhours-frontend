import { defineStore } from 'pinia'

export interface Semester {
  id: number
  name: string
  is_active: boolean
}

export const useSemesterStore = defineStore('semester', {
  state: () => ({
    list: [] as Semester[],
    loaded: false,
  }),
  getters: {
    active: (state) => state.list.find(s => s.is_active) ?? null,
    options: (state) => state.list.map(s => ({
      value: s.id,
      label: s.name + (s.is_active ? ' (Active)' : ''),
    })),
  },
  actions: {
    set(semesters: Semester[]) {
      this.list = semesters
      this.loaded = true
    },
    setActive(id: number) {
      this.list.forEach(s => { s.is_active = s.id === id })
    },
    add(semester: Semester) {
      this.list.push(semester)
    },
    remove(id: number) {
      this.list = this.list.filter(s => s.id !== id)
    },
  },
})
