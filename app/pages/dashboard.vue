<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Dashboard — UHours' })

const { apiFetch } = useAuth()
const toast = useAppToast()

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
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Dashboard</h1>
      <div class="md:hidden">
        <AppProfile />
      </div>
    </div>

    <!-- Semester selector -->
    <div v-if="semesterOptions.length" class="flex flex-col gap-1 mb-6">
      <label class="text-sm font-medium text-[var(--muted)]">Semester</label>
      <Select
        v-model="activeSemesterId"
        :options="semesterOptions"
        option-label="label"
        option-value="value"
        class="w-full"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!semesterOptions.length" class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] text-center">
      <h2 class="font-semibold mb-2">No semester yet</h2>
      <p class="text-sm text-[var(--muted)] mb-4">Create your first semester in Settings before logging hours.</p>
      <Button as="router-link" to="/settings" label="Open Settings" text />
    </div>

    <!-- Dashboard content -->
    <template v-else-if="dashboard">
      <!-- Hours progress card -->
      <div class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
        <div class="flex justify-between items-end mb-2">
          <span class="text-sm font-medium text-[var(--muted)]">Hours completed</span>
          <span class="text-sm font-semibold">{{ quotaPercent }}%</span>
        </div>
        <ProgressBar :value="quotaPercent" :show-value="false" class="mb-3 h-3 rounded-full" />
        <p class="text-2xl font-bold">
          {{ dashboard.total_hours }}
          <span class="text-base font-normal text-[var(--muted)]">/ {{ dashboard.quota_hours }} hrs</span>
        </p>
      </div>

      <!-- Stat grid -->
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

      <!-- Monthly breakdown -->
      <div class="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--border)]">
          <h3 class="font-semibold text-sm">Monthly Breakdown</h3>
        </div>
        <DataTable :value="dashboard.by_month" size="small" :show-gridlines="false">
          <template #empty>
            <div class="text-center text-sm text-[var(--muted)] py-6">No logs yet</div>
          </template>
          <Column field="month" header="Month" />
          <Column field="hours" header="Hours">
            <template #body="{ data }">
              <span class="font-semibold">{{ data.hours }}h</span>
            </template>
          </Column>
          <Column header="">
            <template #body="{ data }">
              <Button
                as="router-link"
                :to="`/log?month=${data.month}`"
                label="View"
                text
                size="small"
                class="text-xs !p-0"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <AppNav />
  </div>
</template>
