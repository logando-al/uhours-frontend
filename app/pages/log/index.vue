<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const route = useRoute()

type Status = 'all' | 'approved' | 'pending' | 'not_submitted'

interface LogEntry {
  id: number
  date: string
  activity: string
  hours: number
  claim_status: string
  approval_status: string
  subject_name?: string
}

const activeTab = ref<Status>('all')
const logs = ref<LogEntry[]>([])
const loading = ref(true)
const selectedSemesterId = ref<number | null>(null)
const semesters = ref<Array<{ id: number; name: string; is_active: boolean }>>([])

const tabs: Array<{ key: Status; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'not_submitted', label: 'Not Submitted' },
]

async function loadSemesters() {
  try {
    const data = await apiFetch<typeof semesters.value>('/semesters')
    semesters.value = data
    const active = data.find(s => s.is_active)
    selectedSemesterId.value = active?.id ?? data[0]?.id ?? null
  } catch { /* handled */ }
}

async function loadLogs() {
  if (!selectedSemesterId.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ semester_id: String(selectedSemesterId.value) })
    if (activeTab.value !== 'all') params.set('approval_status', activeTab.value)
    logs.value = await apiFetch<LogEntry[]>(`/logs?${params}`)
  } catch { /* handled */ } finally {
    loading.value = false
  }
}

watch([activeTab, selectedSemesterId], loadLogs)

onMounted(async () => {
  await loadSemesters()
  await loadLogs()
})

async function deleteLog(id: number) {
  if (!confirm('Delete this entry?')) return
  try {
    await apiFetch(`/logs/${id}`, { method: 'DELETE' })
    logs.value = logs.value.filter(l => l.id !== id)
    toast.success('Entry deleted')
  } catch {
    toast.error('Failed to delete')
  }
}

const semesterOptions = computed(() =>
  semesters.value.map(s => ({ value: s.id, label: s.name + (s.is_active ? ' (Active)' : '') }))
)

function statusColor(status: string) {
  if (status === 'approved') return 'text-green-400 bg-green-900/30'
  if (status === 'pending') return 'text-yellow-400 bg-yellow-900/30'
  return 'text-[var(--muted)] bg-[var(--bg)]'
}
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <h1 class="text-xl font-bold mb-4">Log</h1>

    <BaseSelect v-if="semesterOptions.length" v-model="selectedSemesterId" :options="semesterOptions" class="mb-4" />

    <!-- Tabs -->
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
            <p class="text-xs text-[var(--muted)] mt-0.5">{{ log.date }} · {{ log.hours }}h<span v-if="log.subject_name"> · {{ log.subject_name }}</span></p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusColor(log.approval_status)">
              {{ log.approval_status }}
            </span>
            <NuxtLink :to="`/log/add?edit=${log.id}`" class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </NuxtLink>
            <button class="text-[var(--muted)] hover:text-red-400 transition-colors p-1" @click="deleteLog(log.id)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <NuxtLink to="/log/add" class="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </NuxtLink>

    <AppNav />
    <AppToast />
  </div>
</template>
