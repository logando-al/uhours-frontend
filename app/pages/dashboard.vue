<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Dashboard — UHours' })

const config = useRuntimeConfig()
const auth = useAuthStore()
const { apiFetch } = useAuth()

interface DashboardData {
  quota_total: number
  quota_used: number
  approved_hours: number
  pending_hours: number
  not_submitted_hours: number
  balance_hours: number
  monthly: Array<{ month: string; hours: number; log_count: number }>
}

interface Semester {
  id: number
  name: string
  is_active: boolean
}

const semesters = ref<Semester[]>([])
const activeSemesterId = ref<number | null>(null)
const dashboard = ref<DashboardData | null>(null)
const loading = ref(true)

async function loadSemesters() {
  try {
    const data = await apiFetch<Semester[]>('/semesters')
    semesters.value = data
    const active = data.find(s => s.is_active)
    if (active) activeSemesterId.value = active.id
    else if (data.length) activeSemesterId.value = data[0].id
  } catch { /* handled by apiFetch */ }
}

async function loadDashboard() {
  if (!activeSemesterId.value) return
  loading.value = true
  try {
    dashboard.value = await apiFetch<DashboardData>(`/dashboard?semester_id=${activeSemesterId.value}`)
  } catch { /* handled */ } finally {
    loading.value = false
  }
}

watch(activeSemesterId, loadDashboard)

onMounted(async () => {
  await loadSemesters()
  await loadDashboard()
})

const quotaPercent = computed(() => {
  if (!dashboard.value) return 0
  return Math.min(100, Math.round((dashboard.value.quota_used / dashboard.value.quota_total) * 100))
})

const semesterOptions = computed(() =>
  semesters.value.map(s => ({ value: s.id, label: s.name + (s.is_active ? ' (Active)' : '') }))
)
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold">Dashboard</h1>
        <p class="text-sm text-[var(--muted)]">{{ auth.user?.username }}</p>
      </div>
      <button class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-2" @click="useAuth().logout()">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
      </button>
    </div>

    <!-- Semester selector -->
    <BaseSelect
      v-if="semesterOptions.length"
      v-model="activeSemesterId"
      :options="semesterOptions"
      class="mb-6"
    />

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <template v-else-if="dashboard">
      <!-- Quota progress -->
      <div class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
        <div class="flex justify-between items-end mb-2">
          <span class="text-sm font-medium text-[var(--muted)]">Hours completed</span>
          <span class="text-sm font-semibold">{{ quotaPercent }}%</span>
        </div>
        <div class="h-3 bg-[var(--bg)] rounded-full overflow-hidden mb-2">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="quotaPercent >= 100 ? 'bg-green-500' : 'bg-[var(--accent)]'"
            :style="{ width: `${quotaPercent}%` }"
          />
        </div>
        <p class="text-2xl font-bold">
          {{ dashboard.quota_used }}
          <span class="text-base font-normal text-[var(--muted)]">/ {{ dashboard.quota_total }} hrs</span>
        </p>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Approved</p>
          <p class="text-xl font-bold text-green-400">{{ dashboard.approved_hours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Pending</p>
          <p class="text-xl font-bold text-[var(--accent-warm)]">{{ dashboard.pending_hours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Not Submitted</p>
          <p class="text-xl font-bold text-[var(--muted)]">{{ dashboard.not_submitted_hours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Balance</p>
          <p class="text-xl font-bold">{{ dashboard.balance_hours }}h</p>
        </div>
      </div>

      <!-- Monthly table -->
      <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--border)]">
          <h3 class="font-semibold text-sm">Monthly Breakdown</h3>
        </div>
        <div v-if="dashboard.monthly.length === 0" class="px-4 py-8 text-center text-sm text-[var(--muted)]">No logs yet</div>
        <div v-for="row in dashboard.monthly" :key="row.month" class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
          <span class="text-sm">{{ row.month }}</span>
          <div class="flex items-center gap-3">
            <span class="text-sm text-[var(--muted)]">{{ row.log_count }} entries</span>
            <span class="text-sm font-semibold">{{ row.hours }}h</span>
            <NuxtLink :to="`/log?month=${row.month}`" class="text-[var(--accent)] text-xs hover:underline">View</NuxtLink>
          </div>
        </div>
      </div>
    </template>

    <!-- FAB -->
    <NuxtLink
      to="/log/add"
      class="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
    >
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    </NuxtLink>

    <AppNav />
    <AppToast />
  </div>
</template>
