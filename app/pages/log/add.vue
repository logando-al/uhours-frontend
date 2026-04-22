<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Add Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const editId = computed(() => route.query.edit ? Number(route.query.edit) : null)
const isEdit = computed(() => !!editId.value)

interface Subject {
  id: number
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer: string
}

interface Semester {
  id: number
  name: string
  is_active: boolean
}

const semesters = ref<Semester[]>([])
const subjects = ref<Subject[]>([])
const loading = ref(false)
const pageLoading = ref(true)

const form = reactive({
  semester_id: null as number | null,
  subject_id: null as number | null,
  date: new Date().toISOString().slice(0, 10),
  start_time: '',
  end_time: '',
  activity: '',
  lecturer: '',
  notes: '',
  claim_status: 'not_submitted',
  approval_status: 'pending',
})

const ACTIVITIES = [
  'Tutorial',
  'Lab session',
  'Marking',
  'Consultation',
  'Invigilation',
  'Preparation',
  'Meeting',
  'Other',
]

const activityOptions = ACTIVITIES.map(a => ({ value: a, label: a }))
const claimOptions = [
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
]
const approvalOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const totalHours = computed(() => {
  if (!form.start_time || !form.end_time) return null
  const [sh, sm] = form.start_time.split(':').map(Number)
  const [eh, em] = form.end_time.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return null
  return (mins / 60).toFixed(2)
})

const semesterOptions = computed(() =>
  semesters.value.map(s => ({ value: s.id, label: s.name + (s.is_active ? ' (Active)' : '') }))
)
const subjectOptions = computed(() => [
  { value: 0, label: '— No subject —' },
  ...subjects.value.map(s => ({ value: s.id, label: s.name })),
])

watch(() => form.subject_id, (id) => {
  if (!id) return
  const subj = subjects.value.find(s => s.id === id)
  if (subj) {
    form.start_time = subj.start_time
    form.end_time = subj.end_time
    form.lecturer = subj.lecturer
  }
})

async function loadData() {
  try {
    const [semData, subData] = await Promise.all([
      apiFetch<Semester[]>('/semesters'),
      apiFetch<Subject[]>('/subjects'),
    ])
    semesters.value = semData
    subjects.value = subData
    const active = semData.find(s => s.is_active)
    form.semester_id = active?.id ?? semData[0]?.id ?? null

    if (isEdit.value && editId.value) {
      const entry = await apiFetch<any>(`/logs/${editId.value}`)
      Object.assign(form, {
        semester_id: entry.semester_id,
        subject_id: entry.subject_id ?? null,
        date: entry.date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        activity: entry.activity,
        lecturer: entry.lecturer,
        notes: entry.notes ?? '',
        claim_status: entry.claim_status,
        approval_status: entry.approval_status,
      })
    }
  } catch { /* handled */ } finally {
    pageLoading.value = false
  }
}

onMounted(loadData)

async function submit() {
  if (!form.activity) { toast.error('Select an activity'); return }
  if (!form.start_time || !form.end_time) { toast.error('Enter start and end time'); return }
  if (!totalHours.value) { toast.error('End time must be after start time'); return }
  loading.value = true
  try {
    const payload = {
      ...form,
      subject_id: form.subject_id || undefined,
      hours: Number(totalHours.value),
    }
    if (isEdit.value) {
      await apiFetch(`/logs/${editId.value}`, { method: 'PUT', body: JSON.stringify(payload) })
      toast.success('Entry updated')
    } else {
      await apiFetch('/logs', { method: 'POST', body: JSON.stringify(payload) })
      toast.success('Entry added')
    }
    router.push('/log')
  } catch {
    toast.error('Failed to save entry')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <button class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1" @click="router.back()">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <h1 class="text-xl font-bold">{{ isEdit ? 'Edit Entry' : 'Add Entry' }}</h1>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <BaseSelect v-model="form.semester_id" label="Semester" :options="semesterOptions" />
      <BaseSelect v-model="form.subject_id" label="Subject (optional)" :options="subjectOptions" />

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Date</label>
        <input
          v-model="form.date"
          type="date"
          class="px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Start</label>
          <input v-model="form.start_time" type="time" class="px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">End</label>
          <input v-model="form.end_time" type="time" class="px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all" />
        </div>
      </div>

      <div v-if="totalHours" class="text-sm text-[var(--accent)] font-semibold">
        Total: {{ totalHours }} hours
      </div>

      <BaseSelect v-model="form.activity" label="Activity" :options="activityOptions" placeholder="Select activity" />
      <BaseInput v-model="form.lecturer" label="Lecturer" placeholder="Dr. Ahmad" />
      <BaseInput v-model="form.notes" label="Notes (optional)" placeholder="Additional notes" />

      <div class="grid grid-cols-2 gap-3">
        <BaseSelect v-model="form.claim_status" label="Claim status" :options="claimOptions" />
        <BaseSelect v-model="form.approval_status" label="Approval" :options="approvalOptions" />
      </div>

      <BaseButton type="submit" :loading="loading" full-width class="mt-2">
        {{ isEdit ? 'Save changes' : 'Add entry' }}
      </BaseButton>
    </form>

    <AppToast />
  </div>
</template>
