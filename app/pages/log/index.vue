<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Log — UHours' })

const { apiFetch } = useAuth()
const toast = useAppToast()
const confirm = useConfirm()
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

const selectedMonthPicker = computed({
  get: () => selectedMonth.value ? new Date(selectedMonth.value + '-01T00:00:00') : null,
  set: (val: Date | null) => {
    if (!val) { selectedMonth.value = ''; return }
    selectedMonth.value = `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}`
  },
})
const semesters = ref<Semester[]>([])

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
    selectedSemesterId.value = semesters.value.find(s => s.is_active)?.id ?? semesters.value[0]?.id ?? ''
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

function deleteLog(id: string) {
  confirm.require({
    message: 'Delete this entry? This action cannot be undone.',
    header: 'Delete Entry',
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await apiFetch(`/logs/${id}`, { method: 'DELETE' })
        logs.value = logs.value.filter(log => log.id !== id)
        toast.success('Entry deleted')
      } catch {
        toast.error('Failed to delete')
      }
    },
  })
}

function formatUCampusDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-MY', { month: 'short' })
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warn'
  if (status === 'rejected') return 'danger'
  if (status === 'submitted') return 'info'
  return 'secondary'
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase()
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
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(logs.value.map(l => l.id))
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
      <div class="flex items-center gap-2">
        <Button
          v-if="!selectionMode"
          as="router-link"
          to="/log/batch"
          label="Batch"
          severity="secondary"
          outlined
          size="small"
        />
        <Button
          v-if="!selectionMode && logs.length > 0"
          label="Select"
          text
          size="small"
          @click="enterSelectionMode"
        />
        <Button
          v-else-if="selectionMode"
          label="Cancel"
          text
          severity="secondary"
          size="small"
          @click="exitSelectionMode"
        />
      </div>
    </div>

    <div v-if="semesterOptions.length" class="flex flex-col gap-1 mb-4">
      <label class="text-sm font-medium text-[var(--muted)]">Semester</label>
      <Select v-model="selectedSemesterId" :options="semesterOptions" option-label="label" option-value="value" class="w-full" />
    </div>

    <div class="mb-4">
      <label class="text-sm font-medium text-[var(--muted)] block mb-1">Month</label>
      <DatePicker v-model="selectedMonthPicker" view="month" date-format="MM yy" show-icon fluid />
    </div>

    <!-- Selection mode banner -->
    <div
      v-if="selectionMode"
      class="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl px-4 py-3 mb-4"
    >
      <span class="text-sm font-medium text-[var(--accent)]">
        {{ selectedIds.size === 0 ? 'Tap entries to select' : `${selectedIds.size} selected` }}
      </span>
      <Button
        :label="allSelected ? 'Deselect all' : 'Select all'"
        text
        size="small"
        @click="toggleSelectAll"
      />
    </div>

    <!-- Status filter tabs -->
    <div v-if="!selectionMode" class="overflow-x-auto no-scrollbar mb-4">
      <SelectButton
        v-model="activeTab"
        :options="tabs"
        option-label="label"
        option-value="key"
        class="status-tabs"
      />
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" />
    </div>

    <div v-else-if="logs.length === 0" class="text-center py-12">
      <i class="pi pi-clock text-[var(--muted)] text-4xl mb-3 block" />
      <p class="text-[var(--muted)] text-sm">No entries here yet</p>
      <Button as="router-link" to="/log/add" label="Add your first entry" text class="mt-1" />
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
          <!-- Checkbox in selection mode -->
          <Checkbox
            v-if="selectionMode"
            :model-value="selectedIds.has(log.id)"
            :binary="true"
            class="flex-shrink-0 mt-0.5"
            @change="toggleSelect(log.id)"
          />

          <!-- Fields: Activity → Date → Time → Lecturer -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ log.activity }}</p>
            <p class="text-xs text-[var(--muted)] mt-0.5 font-mono tracking-tight">
              {{ formatUCampusDate(log.log_date) }} &nbsp;·&nbsp; {{ log.start_time }} – {{ log.end_time }}
            </p>
            <p class="text-xs text-[var(--muted)] mt-0.5 truncate">{{ log.lecturer_name }}<span v-if="log.subject_name"> &nbsp;·&nbsp; {{ log.subject_name }}</span></p>
          </div>

          <div v-if="!selectionMode" class="flex items-center gap-1 flex-shrink-0">
            <Tag
              :severity="statusSeverity(activeTab === 'not_yet_submitted' ? log.claim_status : log.approval_status)"
              :value="formatStatus(activeTab === 'not_yet_submitted' ? log.claim_status : log.approval_status)"
              class="text-xs"
            />
            <Button
              as="router-link"
              :to="`/log/add?edit=${log.id}&semester_id=${selectedSemesterId}`"
              icon="pi pi-pencil"
              text
              severity="secondary"
              size="small"
            />
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              size="small"
              @click.stop="deleteLog(log.id)"
            />
          </div>

          <Tag
            v-else
            :severity="statusSeverity(log.approval_status)"
            :value="formatStatus(log.approval_status)"
            class="text-xs flex-shrink-0"
          />
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
          <p class="text-xs text-[var(--muted)] font-medium">
            Mark {{ selectedIds.size }} entr{{ selectedIds.size === 1 ? 'y' : 'ies' }} as:
          </p>
          <div class="flex gap-2">
            <Button
              label="Approved"
              severity="success"
              size="small"
              :loading="bulkLoading"
              class="flex-1"
              @click="bulkUpdate('approval_status', 'approved')"
            />
            <Button
              label="Rejected"
              severity="danger"
              size="small"
              :loading="bulkLoading"
              class="flex-1"
              @click="bulkUpdate('approval_status', 'rejected')"
            />
            <Button
              label="Submitted"
              severity="info"
              size="small"
              :loading="bulkLoading"
              class="flex-1"
              @click="bulkUpdate('claim_status', 'submitted')"
            />
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Prevent wrapping on narrow screens */
:deep(.status-tabs.p-selectbutton) { flex-wrap: nowrap; }
:deep(.status-tabs .p-togglebutton) { white-space: nowrap; }

</style>
