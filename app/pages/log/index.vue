<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const route = useRoute()

type Status = 'all' | 'approved' | 'pending' | 'not_yet_submitted'

interface Semester {
  id: string
  name: string
  is_active: boolean
}

interface LogEntry {
  id: string
  log_date: string
  start_time: string
  end_time: string
  total_hours: number
  activity: string
  lecturer_name: string
  claim_status: string
  approval_status: string
  subject_id?: string | null
  subject_name?: string | null
  notes?: string | null
}

interface LogListResponse {
  items: LogEntry[]
  total: number
  page: number
  limit: number
}

const activeTab = ref<Status>('all')
const logs = ref<LogEntry[]>([])
const loading = ref(true)
const selectedSemesterId = ref<string>('')
const selectedMonth = ref(typeof route.query.month === 'string' ? route.query.month : '')
const semesters = ref<Semester[]>([])

const tabs: Array<{ key: Status; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'not_yet_submitted', label: 'Not Submitted' },
]

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

async function loadSemesters() {
  const data = await apiFetch<Semester[]>('/semesters')
  semesters.value = data ?? []
  if (!selectedSemesterId.value) {
    selectedSemesterId.value = semesters.value.find(semester => semester.is_active)?.id ?? semesters.value[0]?.id ?? ''
  }
}

async function loadLogs() {
  if (!selectedSemesterId.value) return

  loading.value = true
  try {
    const params = new URLSearchParams({ semester_id: selectedSemesterId.value })
    if (selectedMonth.value) params.set('month', selectedMonth.value)

    if (activeTab.value === 'not_yet_submitted') {
      params.set('claim_status', 'not_yet_submitted')
    } else if (activeTab.value !== 'all') {
      params.set('approval_status', activeTab.value)
    }

    const data = await apiFetch<LogListResponse>(`/logs?${params.toString()}`)
    logs.value = data?.items ?? []
  } catch {
    toast.error('Failed to load logs')
  } finally {
    loading.value = false
  }
}

watch([activeTab, selectedSemesterId, selectedMonth], loadLogs)

onMounted(async () => {
  try {
    await loadSemesters()
    await loadLogs()
  } catch {
    loading.value = false
  }
})

async function deleteLog(id: string) {
  if (!confirm('Delete this entry?')) return
  try {
    await apiFetch(`/logs/${id}`, { method: 'DELETE' })
    logs.value = logs.value.filter(log => log.id !== id)
    toast.success('Entry deleted')
  } catch {
    toast.error('Failed to delete')
  }
}

function statusColor(status: string) {
  if (status === 'approved') return 'text-green-400 bg-green-900/30'
  if (status === 'pending') return 'text-yellow-400 bg-yellow-900/30'
  return 'text-[var(--muted)] bg-[var(--bg)]'
}
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <h1 class="text-xl font-bold mb-4">Log</h1>

    <BaseSelect v-if="semesterOptions.length" v-model="selectedSemesterId" label="Semester" :options="semesterOptions" class="mb-4" />

    <div class="mb-4">
      <label class="text-sm font-medium text-[var(--muted)] block mb-1">Month</label>
      <input v-model="selectedMonth" type="month" class="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all" />
    </div>

    <div class="flex gap-1 bg-[var(--bg-card)] p-1 rounded-xl mb-4 border border-[var(--border)]">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
        :class="activeTab === tab.key
          ? 'bg-[var(--accent)] text-white'
          : 'text-[var(--muted)] hover:text-[var(--fg)]'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-[var(--muted)] mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      <p class="text-[var(--muted)] text-sm">No entries here yet</p>
      <NuxtLink to="/log/add" class="text-[var(--accent)] text-sm hover:underline mt-1 inline-block">Add your first entry</NuxtLink>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="log in logs"
        :key="log.id"
        class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ log.activity }}</p>
            <p class="text-xs text-[var(--muted)] mt-0.5">{{ log.log_date }} · {{ log.total_hours }}h<span v-if="log.subject_name"> · {{ log.subject_name }}</span></p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusColor(activeTab === 'not_yet_submitted' ? log.claim_status : log.approval_status)">
              {{ activeTab === 'not_yet_submitted' ? log.claim_status : log.approval_status }}
            </span>
            <NuxtLink :to="`/log/add?edit=${log.id}&semester_id=${selectedSemesterId}`" class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </NuxtLink>
            <button class="text-[var(--muted)] hover:text-red-400 transition-colors p-1" @click="deleteLog(log.id)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppNav />
  </div>
</template>
