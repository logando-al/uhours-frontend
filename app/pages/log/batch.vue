<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Batch Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const router = useRouter()

type BatchTab = 'auto' | 'spreadsheet'

interface Semester {
  id: string
  name: string
  is_active: boolean
}

interface Subject {
  id: string
  subject_name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer_name: string
}

interface SpreadsheetRow {
  date: string
  start_time: string
  end_time: string
  activity: string
  lecturer_name: string
  subject_id: string
}

const activeTab = ref<BatchTab>('auto')
const semesters = ref<Semester[]>([])
const selectedSemesterId = ref<string>('')
const subjects = ref<Subject[]>([])
const pageLoading = ref(true)

const autoSubjectId = ref<string>('')
const autoDateFrom = ref('')
const autoDateTo = ref('')
const autoPreview = ref<Array<{ date: string; selected: boolean; hours: string }>>([])
const autoLoading = ref(false)

const rows = ref<SpreadsheetRow[]>([newRow()])
const saveLoading = ref(false)

const ACTIVITIES = ['Tutorial', 'Lab session', 'Marking', 'Consultation', 'Invigilation', 'Preparation', 'Meeting', 'Other']

const semesterOptions = computed(() =>
  semesters.value.map(semester => ({
    value: semester.id,
    label: semester.name + (semester.is_active ? ' (Active)' : ''),
  })),
)

const subjectOptions = computed(() =>
  subjects.value.map(subject => ({
    value: subject.id,
    label: `${subject.subject_name} (${subject.day_of_week} ${subject.start_time}–${subject.end_time})`,
  })),
)

function newRow(): SpreadsheetRow {
  return {
    date: new Date().toISOString().slice(0, 10),
    start_time: '',
    end_time: '',
    activity: '',
    lecturer_name: '',
    subject_id: '',
  }
}

async function loadSemesters() {
  const data = await apiFetch<Semester[]>('/semesters')
  semesters.value = data ?? []
  selectedSemesterId.value = semesters.value.find(semester => semester.is_active)?.id ?? semesters.value[0]?.id ?? ''
}

async function loadSubjects() {
  if (!selectedSemesterId.value) {
    subjects.value = []
    return
  }

  const data = await apiFetch<Subject[]>(`/subjects?semester_id=${selectedSemesterId.value}`)
  subjects.value = data ?? []
}

onMounted(async () => {
  try {
    await loadSemesters()
    await loadSubjects()
  } catch {
    toast.error('Failed to load batch log data')
  } finally {
    pageLoading.value = false
  }
})

watch(selectedSemesterId, async () => {
  await loadSubjects()
  autoSubjectId.value = ''
  autoPreview.value = []
  rows.value = [newRow()]
})

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

function generatePreview() {
  if (!autoSubjectId.value || !autoDateFrom.value || !autoDateTo.value) return

  const subject = subjects.value.find(item => item.id === autoSubjectId.value)
  if (!subject) return

  const targetDay = DAY_MAP[subject.day_of_week.toLowerCase()]
  const from = new Date(autoDateFrom.value)
  const to = new Date(autoDateTo.value)
  const results: typeof autoPreview.value = []
  const cursor = new Date(from)

  while (cursor <= to) {
    if (cursor.getDay() === targetDay) {
      const [startHour, startMinute] = subject.start_time.split(':').map(Number)
      const [endHour, endMinute] = subject.end_time.split(':').map(Number)
      const hours = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60
      results.push({
        date: cursor.toISOString().slice(0, 10),
        selected: true,
        hours: hours.toFixed(2),
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  autoPreview.value = results
}

watch([autoSubjectId, autoDateFrom, autoDateTo], generatePreview)

async function confirmAutoGenerate() {
  if (!selectedSemesterId.value || !autoSubjectId.value || !autoDateFrom.value || !autoDateTo.value) {
    toast.error('Select a semester, subject, and date range')
    return
  }

  const skipDates = autoPreview.value.filter(row => !row.selected).map(row => row.date)
  autoLoading.value = true
  try {
    const result = await apiFetch<{ created: number }>('/logs/generate', {
      method: 'POST',
      body: JSON.stringify({
        semester_id: selectedSemesterId.value,
        subject_id: autoSubjectId.value,
        date_from: autoDateFrom.value,
        date_to: autoDateTo.value,
        skip_dates: skipDates,
      }),
    })
    toast.success(`${result?.created ?? autoPreview.value.filter(row => row.selected).length} entries created`)
    router.push('/log')
  } catch {
    toast.error('Failed to generate entries')
  } finally {
    autoLoading.value = false
  }
}

function addRow() {
  rows.value.push(newRow())
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}

function rowHours(row: SpreadsheetRow) {
  if (!row.start_time || !row.end_time) return ''
  const [startHour, startMinute] = row.start_time.split(':').map(Number)
  const [endHour, endMinute] = row.end_time.split(':').map(Number)
  const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
  if (minutes <= 0) return ''
  return (minutes / 60).toFixed(2) + 'h'
}

async function saveAll() {
  if (!selectedSemesterId.value) {
    toast.error('Select a semester first')
    return
  }

  const valid = rows.value.filter(row => row.date && row.start_time && row.end_time && row.activity && row.lecturer_name)
  if (!valid.length) {
    toast.error('Fill in at least one complete row')
    return
  }

  saveLoading.value = true
  try {
    const entries = valid.map(row => ({
      subject_id: row.subject_id || undefined,
      log_date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      activity: row.activity,
      lecturer_name: row.lecturer_name,
    }))

    const result = await apiFetch<{ created: number }>('/logs/batch', {
      method: 'POST',
      body: JSON.stringify({
        semester_id: selectedSemesterId.value,
        entries,
      }),
    })
    toast.success(`${result?.created ?? valid.length} entries saved`)
    router.push('/log')
  } catch {
    toast.error('Failed to save batch')
  } finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-3xl mx-auto">
    <div class="flex items-center gap-3 mb-5">
      <button class="text-[var(--muted)] hover:text-[var(--fg)] p-1" @click="router.back()">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <h1 class="text-xl font-bold">Batch Log</h1>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>

    <template v-else>
      <BaseSelect v-if="semesterOptions.length" v-model="selectedSemesterId" label="Semester" :options="semesterOptions" class="mb-4" />

      <div class="flex gap-1 bg-[var(--bg-card)] p-1 rounded-xl mb-5 border border-[var(--border)]">
        <button
          v-for="tab in [{ key: 'auto', label: 'Auto-Generate' }, { key: 'spreadsheet', label: 'Spreadsheet' }] as const"
          :key="tab.key"
          class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
          :class="activeTab === tab.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--fg)]'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'auto'" class="flex flex-col gap-4">
        <BaseSelect v-model="autoSubjectId" label="TA Subject" :options="subjectOptions" placeholder="Select subject" />
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">From</label>
            <input v-model="autoDateFrom" type="date" class="px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">To</label>
            <input v-model="autoDateTo" type="date" class="px-4 py-3 rounded-xl bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none" />
          </div>
        </div>

        <div v-if="autoPreview.length" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div class="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
            <span class="text-sm font-semibold">Preview ({{ autoPreview.filter(row => row.selected).length }} selected)</span>
            <button class="text-xs text-[var(--accent)] hover:underline" @click="autoPreview.forEach(row => row.selected = !autoPreview.every(item => item.selected))">
              Toggle all
            </button>
          </div>
          <div v-for="(row, index) in autoPreview" :key="index" class="flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-0 gap-3">
            <input v-model="row.selected" type="checkbox" class="w-4 h-4 accent-[var(--accent)]" />
            <span class="text-sm flex-1">{{ row.date }}</span>
            <span class="text-xs text-[var(--muted)]">{{ row.hours }}h</span>
          </div>
        </div>

        <div v-else-if="autoSubjectId && autoDateFrom && autoDateTo" class="text-sm text-center text-[var(--muted)] py-4">
          No matching dates in range
        </div>

        <BaseButton
          v-if="autoPreview.length"
          :loading="autoLoading"
          full-width
          @click="confirmAutoGenerate"
        >
          Generate {{ autoPreview.filter(row => row.selected).length }} entries
        </BaseButton>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="(row, index) in rows"
          :key="index"
          class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4"
        >
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-semibold text-[var(--muted)]">Row {{ index + 1 }}</span>
            <div class="flex items-center gap-2">
              <span v-if="rowHours(row)" class="text-xs text-[var(--accent)]">{{ rowHours(row) }}</span>
              <button v-if="rows.length > 1" class="text-[var(--muted)] hover:text-red-400 p-1" @click="removeRow(index)">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-2">
            <div class="flex flex-col gap-1 col-span-3">
              <input v-model="row.date" type="date" class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
            </div>
            <input v-model="row.start_time" type="time" placeholder="Start" class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
            <input v-model="row.end_time" type="time" placeholder="End" class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
            <select v-model="row.activity" class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm">
              <option value="">Activity</option>
              <option v-for="activity in ACTIVITIES" :key="activity" :value="activity">{{ activity }}</option>
            </select>
            <select v-model="row.subject_id" class="col-span-3 px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm">
              <option value="">No subject</option>
              <option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.subject_name }}</option>
            </select>
            <input v-model="row.lecturer_name" placeholder="Lecturer" class="col-span-3 px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
          </div>
        </div>

        <button
          class="flex items-center gap-2 text-sm text-[var(--accent)] hover:underline justify-center py-2"
          @click="addRow"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add row
        </button>

        <BaseButton :loading="saveLoading" full-width @click="saveAll">
          Save all ({{ rows.filter(row => row.date && row.start_time && row.end_time && row.activity && row.lecturer_name).length }} valid)
        </BaseButton>
      </div>
    </template>

  </div>
</template>
