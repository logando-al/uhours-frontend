<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Subjects — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()

interface Subject {
  id: number
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer: string
  semester_id: number
}

const subjects = ref<Subject[]>([])
const loading = ref(true)
const showForm = ref(false)
const formLoading = ref(false)
const editingId = ref<number | null>(null)

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  .map(d => ({ value: d.toLowerCase(), label: d }))

const form = reactive({
  name: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  lecturer: '',
})

function resetForm() {
  form.name = ''
  form.day_of_week = ''
  form.start_time = ''
  form.end_time = ''
  form.lecturer = ''
  editingId.value = null
}

async function loadSubjects() {
  loading.value = true
  try {
    subjects.value = await apiFetch<Subject[]>('/subjects')
  } catch { /* handled */ } finally {
    loading.value = false
  }
}

onMounted(loadSubjects)

function startEdit(subj: Subject) {
  Object.assign(form, {
    name: subj.name,
    day_of_week: subj.day_of_week,
    start_time: subj.start_time,
    end_time: subj.end_time,
    lecturer: subj.lecturer,
  })
  editingId.value = subj.id
  showForm.value = true
}

async function submitForm() {
  if (!form.name.trim() || !form.day_of_week) { toast.error('Name and day are required'); return }
  formLoading.value = true
  try {
    if (editingId.value) {
      const updated = await apiFetch<Subject>(`/subjects/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      const idx = subjects.value.findIndex(s => s.id === editingId.value)
      if (idx !== -1) subjects.value[idx] = updated
      toast.success('Subject updated')
    } else {
      const created = await apiFetch<Subject>('/subjects', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      subjects.value.push(created)
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

async function deleteSubject(id: number) {
  if (!confirm('Delete this subject?')) return
  try {
    await apiFetch(`/subjects/${id}`, { method: 'DELETE' })
    subjects.value = subjects.value.filter(s => s.id !== id)
    toast.success('Subject deleted')
  } catch {
    toast.error('Failed to delete')
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-bold">Subjects</h1>
      <button
        class="flex items-center gap-1.5 text-sm text-[var(--accent)] font-medium"
        @click="() => { resetForm(); showForm = !showForm }"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add Subject
      </button>
    </div>

    <!-- Inline form -->
    <Transition name="slide">
      <div v-if="showForm" class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
        <h3 class="font-semibold mb-4">{{ editingId ? 'Edit Subject' : 'New Subject' }}</h3>
        <form class="flex flex-col gap-3" @submit.prevent="submitForm">
          <BaseInput v-model="form.name" label="Subject name" placeholder="CPC354 Tutorial" required />
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
          <BaseInput v-model="form.lecturer" label="Lecturer" placeholder="Dr. Ahmad" />
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
        v-for="subj in subjects"
        :key="subj.id"
        class="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold">{{ subj.name }}</p>
            <p class="text-sm text-[var(--muted)] mt-0.5">
              {{ capitalize(subj.day_of_week) }} · {{ subj.start_time }}–{{ subj.end_time }}
            </p>
            <p class="text-sm text-[var(--muted)]">{{ subj.lecturer }}</p>
          </div>
          <div class="flex items-center gap-1">
            <button class="text-[var(--muted)] hover:text-[var(--fg)] p-1.5 rounded-lg" @click="startEdit(subj)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button class="text-[var(--muted)] hover:text-red-400 p-1.5 rounded-lg" @click="deleteSubject(subj.id)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppNav />
    <AppToast />
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
