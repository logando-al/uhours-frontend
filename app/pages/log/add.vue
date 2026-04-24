<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Add Log — UHours' })

const { apiFetch } = useAuth()
const toast = useAppToast()
const router = useRouter()
const route = useRoute()

const editId = computed(() => typeof route.query.edit === 'string' ? route.query.edit : null)
const editSemesterId = computed(() => typeof route.query.semester_id === 'string' ? route.query.semester_id : null)
const isEdit = computed(() => !!editId.value)

interface Subject {
  id: string
  subject_name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer_name: string
}

interface Semester {
  id: string
  name: string
  is_active: boolean
}

interface LogEntry {
  id: string
  semester_id?: string
  subject_id?: string | null
  log_date: string
  start_time: string
  end_time: string
  activity: string
  lecturer_name: string
  notes?: string | null
  claim_status: string
  approval_status: string
}

interface LogListResponse {
  items: LogEntry[]
}

const semesters = ref<Semester[]>([])
const subjects = ref<Subject[]>([])
const activities = ref<string[]>([])
const loading = ref(false)
const pageLoading = ref(true)

const form = reactive({
  semester_id: '',
  subject_id: '',
  log_date: new Date().toISOString().slice(0, 10),
  start_time: '',
  end_time: '',
  activity: '',
  lecturer_name: '',
  notes: '',
  claim_status: 'not_yet_submitted',
  approval_status: 'pending',
})

const activityOptions = computed(() =>
  activities.value.map(activity => ({ value: activity, label: activity })),
)
const claimOptions = [
  { value: 'not_yet_submitted', label: 'Not Yet Submitted' },
  { value: 'submitted', label: 'Submitted' },
]
const approvalOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const logDatePicker = computed({
  get: () => form.log_date ? new Date(form.log_date + 'T00:00:00') : null,
  set: (val: Date | null) => { form.log_date = val ? val.toISOString().slice(0, 10) : '' },
})

const totalHours = computed(() => {
  if (!form.start_time || !form.end_time) return null
  const [startHour, startMinute] = form.start_time.split(':').map(Number)
  const [endHour, endMinute] = form.end_time.split(':').map(Number)
  const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  if (minutes <= 0) return null
  return (minutes / 60).toFixed(2)
})

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

const subjectOptions = computed(() => [
  { value: '', label: '— No subject —' },
  ...subjects.value.map(subject => ({ value: subject.id, label: subject.subject_name })),
])

watch(() => form.subject_id, id => {
  if (!id) return
  const subject = subjects.value.find(item => item.id === id)
  if (subject) {
    form.start_time = subject.start_time
    form.end_time = subject.end_time
    form.lecturer_name = subject.lecturer_name
  }
})

watch(() => form.semester_id, async semesterId => {
  if (!semesterId) {
    subjects.value = []
    return
  }
  const data = await apiFetch<Subject[]>(`/subjects?semester_id=${semesterId}`)
  subjects.value = data ?? []
  if (form.subject_id && !subjects.value.some(subject => subject.id === form.subject_id)) {
    form.subject_id = ''
  }
})

async function loadData() {
  try {
    const [semesterData, activityData] = await Promise.all([
      apiFetch<Semester[]>('/semesters'),
      apiFetch<string[]>('/config/activities'),
    ])
    activities.value = activityData ?? []
    semesters.value = semesterData ?? []
    form.semester_id = editSemesterId.value ?? semesters.value.find(semester => semester.is_active)?.id ?? semesters.value[0]?.id ?? ''

    if (form.semester_id) {
      const subjectData = await apiFetch<Subject[]>(`/subjects?semester_id=${form.semester_id}`)
      subjects.value = subjectData ?? []
    }

    if (isEdit.value && editId.value && form.semester_id) {
      const entryList = await apiFetch<LogListResponse>(`/logs?semester_id=${form.semester_id}`)
      const entry = entryList?.items.find(item => item.id === editId.value)
      if (!entry) {
        toast.error('Unable to load the selected entry')
        router.push('/log')
        return
      }
      Object.assign(form, {
        semester_id: form.semester_id,
        subject_id: entry.subject_id ?? '',
        log_date: entry.log_date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        activity: entry.activity,
        lecturer_name: entry.lecturer_name,
        notes: entry.notes ?? '',
        claim_status: entry.claim_status,
        approval_status: entry.approval_status,
      })
    }
  } catch {
    toast.error('Failed to load form data')
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadData)

async function submit() {
  if (!form.semester_id) { toast.error('Select a semester'); return }
  if (!form.activity) { toast.error('Select an activity'); return }
  if (!form.start_time || !form.end_time) { toast.error('Enter start and end time'); return }
  if (!form.lecturer_name.trim()) { toast.error('Enter a lecturer name'); return }
  if (!totalHours.value) { toast.error('End time must be after start time'); return }

  loading.value = true
  try {
    const payload = {
      semester_id: form.semester_id,
      subject_id: form.subject_id || undefined,
      log_date: form.log_date,
      start_time: form.start_time,
      end_time: form.end_time,
      activity: form.activity,
      lecturer_name: form.lecturer_name.trim(),
      notes: form.notes.trim() || undefined,
      claim_status: form.claim_status,
      approval_status: form.approval_status,
    }

    if (isEdit.value && editId.value) {
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
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" />
      <h1 class="text-xl font-bold">{{ isEdit ? 'Edit Entry' : 'Add Entry' }}</h1>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" />
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Semester</label>
        <Select v-model="form.semester_id" :options="semesterOptions" option-label="label" option-value="value" class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Subject (optional)</label>
        <Select v-model="form.subject_id" :options="subjectOptions" option-label="label" option-value="value" class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Date</label>
        <DatePicker v-model="logDatePicker" date-format="dd/mm/yy" show-icon fluid />
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

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Activity</label>
        <Select v-model="form.activity" :options="activityOptions" option-label="label" option-value="value" placeholder="Select activity" class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Lecturer</label>
        <InputText v-model="form.lecturer_name" placeholder="Dr. Ahmad" fluid />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--muted)]">Notes (optional)</label>
        <InputText v-model="form.notes" placeholder="Additional notes" fluid />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Claim status</label>
          <Select v-model="form.claim_status" :options="claimOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Approval</label>
          <Select v-model="form.approval_status" :options="approvalOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>

      <Button type="submit" :loading="loading" :label="isEdit ? 'Save changes' : 'Add entry'" fluid class="mt-2" />
    </form>
  </div>
</template>
