<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Dashboard — UHours' })

const auth = useAuthStore()
const { apiFetch, logout } = useAuth()
const toast = useToast()

interface DashboardData {
  quota_hours: number
  total_hours: number
  balance_hours: number
  percentage_used: number
  by_status: Record<string, number>
  by_month: Array<{ month: string; hours: number }>
  semester: { id: string; name: string }
}

interface Semester {
  id: string
  name: string
  is_active: boolean
}

const semesters = ref<Semester[]>([])
const activeSemesterId = ref<string>('')
const dashboard = ref<DashboardData | null>(null)
const loading = ref(true)

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

const approvedHours = computed(() => dashboard.value?.by_status?.approved ?? 0)
const pendingHours = computed(() => dashboard.value?.by_status?.pending ?? 0)
const notSubmittedHours = computed(() => dashboard.value?.by_status?.not_yet_submitted ?? 0)
const quotaPercent = computed(() => Math.min(100, Math.round(dashboard.value?.percentage_used ?? 0)))

async function loadSemesters() {
  try {
    const data = await apiFetch<Semester[]>('/semesters')
    semesters.value = data ?? []
    const active = semesters.value.find(semester => semester.is_active)
    activeSemesterId.value = active?.id ?? semesters.value[0]?.id ?? ''
  } catch {
    toast.error('Failed to load semesters')
  }
}

async function loadDashboard() {
  if (!activeSemesterId.value) {
    dashboard.value = null
    loading.value = false
    return
  }

  loading.value = true
  try {
    dashboard.value = await apiFetch<DashboardData>(`/dashboard?semester_id=${activeSemesterId.value}`)
  } catch {
    dashboard.value = null
    toast.error('Failed to load dashboard')
  } finally {
    loading.value = false
  }
}

watch(activeSemesterId, loadDashboard)

onMounted(async () => {
  await loadSemesters()
  await loadDashboard()
})
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold">Dashboard</h1>
        <p class="text-sm text-[var(--muted)]">{{ auth.user?.username }}</p>
      </div>
      <button class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-2" @click="logout()">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
      </button>
    </div>

    <BaseSelect
      v-if="semesterOptions.length"
      v-model="activeSemesterId"
      label="Semester"
      :options="semesterOptions"
      class="mb-6"
    />

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <div v-else-if="!semesterOptions.length" class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] text-center">
      <h2 class="font-semibold mb-2">No semester yet</h2>
      <p class="text-sm text-[var(--muted)] mb-4">Create your first semester in Settings before logging hours.</p>
      <NuxtLink to="/settings" class="text-[var(--accent)] font-medium hover:underline">Open Settings</NuxtLink>
    </div>

    <template v-else-if="dashboard">
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
          {{ dashboard.total_hours }}
          <span class="text-base font-normal text-[var(--muted)]">/ {{ dashboard.quota_hours }} hrs</span>
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Approved</p>
          <p class="text-xl font-bold text-green-400">{{ approvedHours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Pending</p>
          <p class="text-xl font-bold text-[var(--accent-warm)]">{{ pendingHours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Not Submitted</p>
          <p class="text-xl font-bold text-[var(--muted)]">{{ notSubmittedHours }}h</p>
        </div>
        <div class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p class="text-xs text-[var(--muted)] mb-1">Balance</p>
          <p class="text-xl font-bold">{{ dashboard.balance_hours }}h</p>
        </div>
      </div>

      <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--border)]">
          <h3 class="font-semibold text-sm">Monthly Breakdown</h3>
        </div>
        <div v-if="dashboard.by_month.length === 0" class="px-4 py-8 text-center text-sm text-[var(--muted)]">No logs yet</div>
        <div v-for="row in dashboard.by_month" :key="row.month" class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
          <span class="text-sm">{{ row.month }}</span>
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold">{{ row.hours }}h</span>
            <NuxtLink :to="`/log?month=${row.month}`" class="text-[var(--accent)] text-xs hover:underline">View</NuxtLink>
          </div>
        </div>
      </div>
    </template>

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
