<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Settings — UHours' })

const { apiFetch, logout, auth } = useAuth()
const toast = useAppToast()
const confirm = useConfirm()
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

const AVATARS = [
  '🐻', '🦊', '🐧', '🦁', '🐸', '🦋',
  '🐺', '🦄', '🐯', '🐮', '🐙', '🦅',
  '🐬', '🦀', '🐲', '🦉', '🐼', '🦩',
]
const selectedAvatar = computed(() => auth.user?.avatar ?? '🐻')
const avatarForm = ref(auth.user?.avatar ?? '🐻')
const avatarPickerOpen = ref(false)
const saveAvatarLoading = ref(false)

function toggleAvatarPicker() {
  avatarPickerOpen.value = !avatarPickerOpen.value
  if (avatarPickerOpen.value) avatarForm.value = selectedAvatar.value
}

async function saveAvatar() {
  if (!avatarForm.value.trim()) return
  saveAvatarLoading.value = true
  try {
    await apiFetch('/users/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatar: avatarForm.value }),
    })
    auth.setAvatar(avatarForm.value)
    avatarPickerOpen.value = false
    toast.success('Avatar saved')
  } catch {
    toast.error('Failed to save avatar')
  } finally {
    saveAvatarLoading.value = false
  }
}

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

const startDatePicker = computed({
  get: () => semesterForm.start_date ? new Date(semesterForm.start_date + 'T00:00:00') : null,
  set: (val: Date | null) => { semesterForm.start_date = val ? val.toISOString().slice(0, 10) : '' },
})
const endDatePicker = computed({
  get: () => semesterForm.end_date ? new Date(semesterForm.end_date + 'T00:00:00') : null,
  set: (val: Date | null) => { semesterForm.end_date = val ? val.toISOString().slice(0, 10) : '' },
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
      if (normalized.is_active) semesters.value.forEach(s => { s.is_active = false })
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
    semesters.value = semesters.value.map(s => ({ ...s, is_active: s.id === id }))
    if (updated) {
      const normalized = normalizeSemester(updated)
      semesters.value = semesters.value.map(s => s.id === normalized.id ? normalized : s)
    }
    toast.success('Active semester updated')
  } catch {
    toast.error('Failed to update')
  }
}

function deleteSemester(id: string) {
  confirm.require({
    message: 'Delete this semester? This action cannot be undone.',
    header: 'Delete Semester',
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await apiFetch(`/semesters/${id}`, { method: 'DELETE' })
        semesters.value = semesters.value.filter(s => s.id !== id)
        toast.success('Semester deleted')
      } catch (error: any) {
        toast.error(error?.message ?? 'Failed to delete')
      }
    },
  })
}

onMounted(loadSemesters)
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <h1 class="text-xl font-bold mb-6">Settings</h1>

    <!-- Appearance -->
    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Appearance</h2>
      <SelectButton
        :model-value="theme"
        :options="themeOptions"
        option-label="label"
        option-value="key"
        class="w-full"
        @update:model-value="setTheme"
      />
    </section>

    <!-- Password -->
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
        <i class="pi pi-chevron-right text-[var(--muted)]" />
      </NuxtLink>
    </section>

    <!-- Avatar -->
    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Avatar</h2>
      <button
        class="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-4 text-[var(--fg)] transition-all hover:border-[var(--accent)] w-full text-left"
        @click="toggleAvatarPicker"
      >
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-xl leading-none shrink-0 select-none">{{ selectedAvatar }}</span>
          <div>
            <p class="font-medium">Change avatar</p>
            <p class="text-sm text-[var(--muted)] mt-0.5">Choose a preset or type any emoji.</p>
          </div>
        </div>
        <i
          class="pi pi-chevron-down text-[var(--muted)] transition-transform duration-200"
          :class="avatarPickerOpen ? 'rotate-180' : ''"
        />
      </button>

      <div v-if="avatarPickerOpen" class="mt-3 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <span class="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-2xl leading-none shrink-0 select-none">{{ avatarForm || '?' }}</span>
          <InputText v-model="avatarForm" placeholder="Type or paste any emoji" fluid />
        </div>
        <div class="grid grid-cols-9 gap-1">
          <button
            v-for="avatar in AVATARS"
            :key="avatar"
            class="text-xl p-1.5 rounded-lg transition-all hover:bg-[var(--bg)] text-center cursor-pointer"
            :class="avatarForm === avatar ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10' : ''"
            @click="avatarForm = avatar"
          >{{ avatar }}</button>
        </div>
        <Button label="Save avatar" fluid :loading="saveAvatarLoading" @click="saveAvatar" />
      </div>
    </section>

    <!-- Semesters -->
    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Semesters</h2>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="col-span-2 flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Semester name</label>
          <InputText v-model="semesterForm.name" placeholder="Jan 2026" fluid />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Year</label>
          <InputText v-model="semesterForm.year" type="number" fluid />
        </div>
        <label class="flex items-end gap-2 text-sm text-[var(--muted)] pb-3 cursor-pointer">
          <Checkbox v-model="semesterForm.is_active" :binary="true" input-id="is-active" />
          <span>Set as active</span>
        </label>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Start date</label>
          <DatePicker v-model="startDatePicker" date-format="dd/mm/yy" show-icon fluid />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">End date</label>
          <DatePicker v-model="endDatePicker" date-format="dd/mm/yy" show-icon fluid />
        </div>
      </div>

      <Button :loading="semFormLoading" label="Add semester" fluid class="mb-4" @click="addSemester" />

      <div v-if="semesterLoading" class="flex justify-center py-4">
        <ProgressSpinner stroke-width="3" style="width: 28px; height: 28px;" />
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="semester in semesters"
          :key="semester.id"
          class="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0"
        >
          <div class="flex-1">
            <span class="text-sm font-medium">{{ semester.name }}</span>
            <Tag v-if="semester.is_active" value="Active" severity="success" class="ml-2 text-xs" />
            <p class="text-xs text-[var(--muted)] mt-0.5">{{ semester.start_date }} → {{ semester.end_date }}</p>
          </div>
          <Button v-if="!semester.is_active" label="Set active" text size="small" @click="setActiveSemester(semester.id)" />
          <Button icon="pi pi-trash" text severity="danger" size="small" @click="deleteSemester(semester.id)" />
        </div>
        <p v-if="semesters.length === 0" class="text-sm text-[var(--muted)]">No semesters yet</p>
      </div>
    </section>

    <Button
      label="Sign out"
      severity="danger"
      text
      fluid
      class="md:hidden"
      @click="logout"
    />

    <AppNav />
  </div>
</template>
