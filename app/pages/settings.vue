<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Settings — UHours' })

const { apiFetch, logout } = useAuth()
const toast = useToast()
const { theme, setTheme, init } = useTheme()

onMounted(init)

type ThemeMode = 'dark' | 'light' | 'system'

interface Semester {
  id: string
  name: string
  year: number
  start_date: string
  end_date: string
  is_active: boolean
}

interface SemesterApi {
  id?: string
  name?: string
  year?: number | string
  start_date?: string
  end_date?: string
  is_active?: boolean
  ID?: string
  Name?: string
  Year?: number | string
  StartDate?: string
  EndDate?: string
  IsActive?: boolean
}

const themeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
]

const semesters = ref<Semester[]>([])
const semesterLoading = ref(true)
const semFormLoading = ref(false)
const semesterForm = reactive({
  name: '',
  year: String(new Date().getFullYear()),
  start_date: '',
  end_date: '',
  is_active: semesters.value.length === 0,
})

function normalizeSemester(raw: SemesterApi): Semester {
  return {
    id: raw.id ?? raw.ID ?? '',
    name: raw.name ?? raw.Name ?? '',
    year: Number(raw.year ?? raw.Year ?? new Date().getFullYear()),
    start_date: raw.start_date ?? raw.StartDate ?? '',
    end_date: raw.end_date ?? raw.EndDate ?? '',
    is_active: raw.is_active ?? raw.IsActive ?? false,
  }
}

async function loadSemesters() {
  semesterLoading.value = true
  try {
    const data = await apiFetch<SemesterApi[]>('/semesters')
    semesters.value = (data ?? []).map(normalizeSemester)
    semesterForm.is_active = semesters.value.length === 0
  } catch {
    toast.error('Failed to load semesters')
  } finally {
    semesterLoading.value = false
  }
}

async function addSemester() {
  if (!semesterForm.name.trim() || !semesterForm.start_date || !semesterForm.end_date) {
    toast.error('Fill in the semester details first')
    return
  }

  semFormLoading.value = true
  try {
    const created = await apiFetch<SemesterApi>('/semesters', {
      method: 'POST',
      body: JSON.stringify({
        name: semesterForm.name.trim(),
        year: Number(semesterForm.year),
        start_date: semesterForm.start_date,
        end_date: semesterForm.end_date,
        is_active: semesterForm.is_active,
      }),
    })

    if (created) {
      const normalized = normalizeSemester(created)
      if (normalized.is_active) {
        semesters.value.forEach(semester => { semester.is_active = false })
      }
      semesters.value.push(normalized)
    }

    semesterForm.name = ''
    semesterForm.start_date = ''
    semesterForm.end_date = ''
    semesterForm.year = String(new Date().getFullYear())
    semesterForm.is_active = false
    toast.success('Semester added')
  } catch {
    toast.error('Failed to add semester')
  } finally {
    semFormLoading.value = false
  }
}

async function setActiveSemester(id: string) {
  try {
    const updated = await apiFetch<SemesterApi>(`/semesters/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: true }),
    })

    semesters.value = semesters.value.map(semester => ({
      ...semester,
      is_active: semester.id === id,
    }))

    if (updated) {
      const normalized = normalizeSemester(updated)
      semesters.value = semesters.value.map(semester => semester.id === normalized.id ? normalized : semester)
    }

    toast.success('Active semester updated')
  } catch {
    toast.error('Failed to update')
  }
}

async function deleteSemester(id: string) {
  if (!confirm('Delete this semester?')) return
  try {
    await apiFetch(`/semesters/${id}`, { method: 'DELETE' })
    semesters.value = semesters.value.filter(semester => semester.id !== id)
    toast.success('Semester deleted')
  } catch (error: any) {
    toast.error(error?.message ?? 'Failed to delete')
  }
}

onMounted(loadSemesters)
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <h1 class="text-xl font-bold mb-6">Settings</h1>

    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Appearance</h2>
      <div class="flex gap-2">
        <button
          v-for="opt in themeOptions"
          :key="opt.key"
          class="flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all"
          :class="theme === opt.key
            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
            : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]'"
          @click="setTheme(opt.key)"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Password</h2>
      <NuxtLink
        to="/change-password"
        class="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 text-[var(--fg)] transition-all hover:border-[var(--accent)]"
      >
        <div>
          <p class="font-medium">Change password</p>
          <p class="text-sm text-[var(--muted)] mt-1">Verify with Telegram TAC on the next screen.</p>
        </div>
        <svg class="w-5 h-5 text-[var(--muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </NuxtLink>
    </section>

    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Semesters</h2>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="col-span-2">
          <BaseInput v-model="semesterForm.name" label="Semester name" placeholder="Jan 2026" required />
        </div>
        <BaseInput v-model="semesterForm.year" label="Year" type="number" />
        <label class="flex items-end gap-2 text-sm text-[var(--muted)] pb-3">
          <input v-model="semesterForm.is_active" type="checkbox" class="accent-[var(--accent)]" />
          Set as active
        </label>
        <div>
          <label class="text-sm font-medium text-[var(--muted)] block mb-1">Start date</label>
          <input v-model="semesterForm.start_date" type="date" class="w-full px-4 py-3 rounded-xl bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
        </div>
        <div>
          <label class="text-sm font-medium text-[var(--muted)] block mb-1">End date</label>
          <input v-model="semesterForm.end_date" type="date" class="w-full px-4 py-3 rounded-xl bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
        </div>
      </div>

      <BaseButton :loading="semFormLoading" full-width class="mb-4" @click="addSemester">Add semester</BaseButton>

      <div v-if="semesterLoading" class="flex justify-center py-4">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="semester in semesters"
          :key="semester.id"
          class="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0"
        >
          <div class="flex-1">
            <span class="text-sm font-medium">{{ semester.name }}</span>
            <span v-if="semester.is_active" class="ml-2 text-xs text-green-400">Active</span>
            <p class="text-xs text-[var(--muted)] mt-0.5">{{ semester.start_date }} → {{ semester.end_date }}</p>
          </div>
          <button v-if="!semester.is_active" class="text-xs text-[var(--accent)] hover:underline" @click="setActiveSemester(semester.id)">Set active</button>
          <button class="text-[var(--muted)] hover:text-red-400 p-1" @click="deleteSemester(semester.id)">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
          </button>
        </div>
        <p v-if="semesters.length === 0" class="text-sm text-[var(--muted)]">No semesters yet</p>
      </div>
    </section>

    <BaseButton variant="ghost" full-width class="md:hidden text-red-400 hover:text-red-300" @click="logout">
      Sign out
    </BaseButton>

    <AppNav />
  </div>
</template>
