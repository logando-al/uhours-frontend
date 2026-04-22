<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Subjects — UHours' })

const { apiFetch } = useAuth()
const toast = useAppToast()

interface Semester {
  id: string
  name: string
  is_active: boolean
}

interface Subject {
  id: string
  semester_id: string
  subject_code?: string | null
  subject_name: string
  lecturer_name: string
  day_of_week: string
  start_time: string
  end_time: string
}

const semesters = ref<Semester[]>([])
const selectedSemesterId = ref<string>('')
const subjects = ref<Subject[]>([])
const loading = ref(true)
const showForm = ref(false)
const formLoading = ref(false)
const editingId = ref<string | null>(null)

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  .map(d => ({ value: d.toLowerCase(), label: d }))

const form = reactive({
  subject_code: '',
  subject_name: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  lecturer_name: '',
})

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

function resetForm() {
  form.subject_code = ''
  form.subject_name = ''
  form.day_of_week = ''
  form.start_time = ''
  form.end_time = ''
  form.lecturer_name = ''
  editingId.value = null
}

async function loadSemesters() {
  const data = await apiFetch<Semester[]>('/semesters')
  semesters.value = data ?? []
  if (!selectedSemesterId.value) {
    selectedSemesterId.value = semesters.value.find(semester => semester.is_active)?.id ?? semesters.value[0]?.id ?? ''
  }
}

async function loadSubjects() {
  if (!selectedSemesterId.value) {
    subjects.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    const data = await apiFetch<Subject[]>(`/subjects?semester_id=${selectedSemesterId.value}`)
    subjects.value = data ?? []
  } catch {
    toast.error('Failed to load subjects')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadSemesters()
    await loadSubjects()
  } catch {
    loading.value = false
  }
})

watch(selectedSemesterId, async () => {
  resetForm()
  showForm.value = false
  await loadSubjects()
})

function startEdit(subject: Subject) {
  Object.assign(form, {
    subject_code: subject.subject_code ?? '',
    subject_name: subject.subject_name,
    day_of_week: subject.day_of_week,
    start_time: subject.start_time,
    end_time: subject.end_time,
    lecturer_name: subject.lecturer_name,
  })
  editingId.value = subject.id
  showForm.value = true
}

async function submitForm() {
  if (!selectedSemesterId.value) {
    toast.error('Create a semester first')
    return
  }

  if (!form.subject_name.trim() || !form.day_of_week || !form.start_time || !form.end_time || !form.lecturer_name.trim()) {
    toast.error('Fill in all required subject fields')
    return
  }

  formLoading.value = true

  const payload = {
    semester_id: selectedSemesterId.value,
    subject_code: form.subject_code.trim() || undefined,
    subject_name: form.subject_name.trim(),
    lecturer_name: form.lecturer_name.trim(),
    day_of_week: form.day_of_week,
    start_time: form.start_time,
    end_time: form.end_time,
  }

  try {
    if (editingId.value) {
      const updated = await apiFetch<Subject>(`/subjects/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      if (updated) {
        const index = subjects.value.findIndex(subject => subject.id === editingId.value)
        if (index !== -1) subjects.value[index] = updated
      }
      toast.success('Subject updated')
    } else {
      const created = await apiFetch<Subject>('/subjects', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (created) subjects.value.push(created)
      toast.success('Subject added')
    }

    showForm.value = false
    resetForm()
  } catch {
    toast.error('Failed to save subject')
  } finally {
    formLoading.value = false
  }
}

async function deleteSubject(id: string) {
  if (!confirm('Delete this subject?')) return
  try {
    await apiFetch(`/subjects/${id}`, { method: 'DELETE' })
    subjects.value = subjects.value.filter(subject => subject.id !== id)
    toast.success('Subject deleted')
  } catch {
    toast.error('Failed to delete')
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-5 gap-3">
      <h1 class="text-xl font-bold">Subjects</h1>
      <button
        class="flex items-center gap-1.5 text-sm text-[var(--accent)] font-medium"
        @click="() => { resetForm(); showForm = !showForm }"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add Subject
      </button>
    </div>

    <BaseSelect
      v-if="semesterOptions.length"
      v-model="selectedSemesterId"
      label="Semester"
      :options="semesterOptions"
      class="mb-4"
    />

    <p v-else class="text-sm text-[var(--muted)] mb-4">Create a semester first before adding subjects.</p>

    <Transition name="slide">
      <div v-if="showForm" class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
        <h3 class="font-semibold mb-4">{{ editingId ? 'Edit Subject' : 'New Subject' }}</h3>
        <form class="flex flex-col gap-3" @submit.prevent="submitForm">
          <BaseInput v-model="form.subject_code" label="Subject code" placeholder="ICTD3143" />
          <BaseInput v-model="form.subject_name" label="Subject name" placeholder="Database Systems" required />
          <BaseSelect v-model="form.day_of_week" label="Day" :options="DAY_OPTIONS" placeholder="Select day" />
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-[var(--muted)]">Start</label>
              <input v-model="form.start_time" type="time" class="px-4 py-3 rounded-xl bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-[var(--muted)]">End</label>
              <input v-model="form.end_time" type="time" class="px-4 py-3 rounded-xl bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
            </div>
          </div>
          <BaseInput v-model="form.lecturer_name" label="Lecturer" placeholder="Dr. Ahmad" required />
          <div class="flex gap-2 pt-1">
            <BaseButton type="submit" :loading="formLoading" full-width>Save</BaseButton>
            <BaseButton variant="ghost" @click="showForm = false">Cancel</BaseButton>
          </div>
        </form>
      </div>
    </Transition>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <div v-else-if="subjects.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-[var(--muted)] mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
      <p class="text-[var(--muted)] text-sm">No subjects yet</p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="subject in subjects"
        :key="subject.id"
        class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold">{{ subject.subject_name }}</p>
            <p v-if="subject.subject_code" class="text-xs text-[var(--muted)] mt-0.5">{{ subject.subject_code }}</p>
            <p class="text-sm text-[var(--muted)] mt-0.5">
              {{ capitalize(subject.day_of_week) }} · {{ subject.start_time }}–{{ subject.end_time }}
            </p>
            <p class="text-sm text-[var(--muted)]">{{ subject.lecturer_name }}</p>
          </div>
          <div class="flex items-center gap-1">
            <button class="text-[var(--muted)] hover:text-[var(--fg)] p-1.5 rounded-lg" @click="startEdit(subject)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button class="text-[var(--muted)] hover:text-red-400 p-1.5 rounded-lg" @click="deleteSubject(subject.id)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppNav />
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
