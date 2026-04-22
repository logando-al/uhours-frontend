<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const route = useRoute()

type Status = 'all' | 'approved' | 'pending' | 'rejected' | 'not_yet_submitted'

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

// Selection mode state
const selectionMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const bulkLoading = ref(false)

const tabs: Array<{ key: Status; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'not_yet_submitted', label: 'Not Submitted' },
]

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

const allSelected = computed(() =>
  logs.value.length > 0 && selectedIds.value.size === logs.value.length,
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
  if (status === 'rejected') return 'text-red-400 bg-red-900/30'
  if (status === 'submitted') return 'text-blue-400 bg-blue-900/30'
  return 'text-[var(--muted)] bg-[var(--bg)]'
}

function enterSelectionMode() {
  selectionMode.value = true
  selectedIds.value = new Set()
}

function exitSelectionMode() {
  selectionMode.value = false
  selectedIds.value = new Set()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(logs.value.map(l => l.id))
  }
}

async function bulkUpdate(field: string, value: string) {
  if (selectedIds.value.size === 0) return
  bulkLoading.value = true
  try {
    const result = await apiFetch<{ updated: number }>('/logs/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ ids: [...selectedIds.value], field, value }),
    })
    toast.success(`${result?.updated ?? selectedIds.value.size} entries updated`)
    exitSelectionMode()
    await loadLogs()
  } catch {
    toast.error('Failed to update entries')
  } finally {
    bulkLoading.value = false
  }
}
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">Log</h1>
      <button
        v-if="!selectionMode && logs.length > 0"
        class="text-sm text-[var(--accent)] font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--accent)]/10 transition-colors"
        @click="enterSelectionMode"
      >
        Select
      </button>
      <button
        v-else-if="selectionMode"
        class="text-sm text-[var(--muted)] font-medium px-3 py-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
        @click="exitSelectionMode"
      >
        Cancel
      </button>
    </div>

    <BaseSelect v-if="semesterOptions.length" v-model="selectedSemesterId" label="Semester" :options="semesterOptions" class="mb-4" />

    <div class="mb-4">
      <label class="text-sm font-medium text-[var(--muted)] block mb-1">Month</label>
      <input v-model="selectedMonth" type="month" class="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all" />
    </div>

    <!-- Selection mode banner -->
    <div
      v-if="selectionMode"
      class="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl px-4 py-3 mb-4"
    >
      <span class="text-sm font-medium text-[var(--accent)]">
        {{ selectedIds.size === 0 ? 'Tap entries to select' : `${selectedIds.size} selected` }}
      </span>
      <button
        class="text-xs font-semibold text-[var(--accent)] hover:underline"
        @click="toggleSelectAll"
      >
        {{ allSelected ? 'Deselect all' : 'Select all' }}
      </button>
    </div>

    <!-- Status filter tabs (hidden in selection mode) -->
    <div v-if="!selectionMode" class="flex gap-1 bg-[var(--bg-card)] p-1 rounded-xl mb-4 border border-[var(--border)] overflow-x-auto no-scrollbar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all"
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
        class="bg-[var(--bg-card)] rounded-xl p-4 border transition-all"
        :class="selectionMode && selectedIds.has(log.id)
          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
          : 'border-[var(--border)]'"
        @click="selectionMode ? toggleSelect(log.id) : undefined"
      >
        <div class="flex items-start gap-3">
          <!-- Checkbox (selection mode only) -->
          <div
            v-if="selectionMode"
            class="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all"
            :class="selectedIds.has(log.id)
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'border-[var(--border)]'"
          >
            <svg v-if="selectedIds.has(log.id)" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ log.activity }}</p>
            <p class="text-xs text-[var(--muted)] mt-0.5">{{ log.log_date }} · {{ log.total_hours }}h<span v-if="log.subject_name"> · {{ log.subject_name }}</span></p>
          </div>

          <div v-if="!selectionMode" class="flex items-center gap-2 flex-shrink-0">
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

          <!-- Status badge in selection mode -->
          <span
            v-else
            class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            :class="statusColor(log.approval_status)"
          >{{ log.approval_status }}</span>
        </div>
      </div>
    </div>

    <!-- Bulk action bar -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="selectionMode && selectedIds.size > 0"
        class="fixed bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+5.5rem)] left-4 right-4 max-w-[416px] md:max-w-[calc(48rem-4rem)] mx-auto z-30"
      >
        <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3 shadow-xl shadow-black/10 backdrop-blur-xl flex flex-col gap-2">
          <p class="text-xs text-[var(--muted)] font-medium">Mark {{ selectedIds.size }} entr{{ selectedIds.size === 1 ? 'y' : 'ies' }} as:</p>
          <div class="flex gap-2 flex-wrap">
            <button
              class="flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors active:scale-95 touch-manipulation"
              :disabled="bulkLoading"
              @click="bulkUpdate('approval_status', 'approved')"
            >Approved</button>
            <button
              class="flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors active:scale-95 touch-manipulation"
              :disabled="bulkLoading"
              @click="bulkUpdate('approval_status', 'rejected')"
            >Rejected</button>
            <button
              class="flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors active:scale-95 touch-manipulation"
              :disabled="bulkLoading"
              @click="bulkUpdate('claim_status', 'submitted')"
            >Submitted</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
