<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Batch Log — UHours' })

const { apiFetch } = useAuth()
const toast = useAppToast()
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

const autoDateFromPicker = computed({
  get: () => autoDateFrom.value ? new Date(autoDateFrom.value + 'T00:00:00') : null,
  set: (val: Date | null) => { autoDateFrom.value = val ? val.toISOString().slice(0, 10) : '' },
})
const autoDateToPicker = computed({
  get: () => autoDateTo.value ? new Date(autoDateTo.value + 'T00:00:00') : null,
  set: (val: Date | null) => { autoDateTo.value = val ? val.toISOString().slice(0, 10) : '' },
})
const autoPreview = ref<Array<{ date: string; selected: boolean; hours: string }>>([])
const autoLoading = ref(false)

const rows = ref<SpreadsheetRow[]>([newRow()])
const saveLoading = ref(false)
const { activities, loadActivities } = useActivities()

const batchTabs = [
  { key: 'auto' as BatchTab, label: 'Auto-Generate' },
  { key: 'spreadsheet' as BatchTab, label: 'Spreadsheet' },
]

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

const activityOptions = computed(() =>
  activities.value.map(a => ({ value: a, label: a })),
)

const rowSubjectOptions = computed(() => [
  { value: '', label: 'No subject' },
  ...subjects.value.map(s => ({ value: s.id, label: s.subject_name })),
])

function newRow(): SpreadsheetRow {
  return { date: new Date().toISOString().slice(0, 10), start_time: '', end_time: '', activity: '', lecturer_name: '', subject_id: '' }
}

async function loadSemesters() {
  const data = await apiFetch<Semester[]>('/semesters')
  semesters.value = data ?? []
  selectedSemesterId.value = semesters.value.find(s => s.is_active)?.id ?? semesters.value[0]?.id ?? ''
}

async function loadSubjects() {
  if (!selectedSemesterId.value) { subjects.value = []; return }
  const data = await apiFetch<Subject[]>(`/subjects?semester_id=${selectedSemesterId.value}`)
  subjects.value = data ?? []
}

const initialized = ref(false)

onMounted(async () => {
  try {
    await Promise.all([loadSemesters(), loadActivities()])
    await loadSubjects()
    initialized.value = true
  } catch {
    toast.error('Failed to load batch log data')
  } finally {
    pageLoading.value = false
  }
})

watch(selectedSemesterId, async () => {
  if (!initialized.value) return
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
  const subject = subjects.value.find(s => s.id === autoSubjectId.value)
  if (!subject) return
  const targetDay = DAY_MAP[subject.day_of_week.toLowerCase()]
  const from = new Date(autoDateFrom.value)
  const to = new Date(autoDateTo.value)
  const results: typeof autoPreview.value = []
  const cursor = new Date(from)
  while (cursor <= to) {
    if (cursor.getDay() === targetDay) {
      const [sh, sm] = subject.start_time.split(':').map(Number)
      const [eh, em] = subject.end_time.split(':').map(Number)
      const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
      results.push({ date: cursor.toISOString().slice(0, 10), selected: true, hours: hours.toFixed(2) })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  autoPreview.value = results
}

watch([autoSubjectId, autoDateFrom, autoDateTo], generatePreview)

function formatPreviewDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-MY', { weekday: 'short', day: '2-digit', month: 'short' })
}

async function confirmAutoGenerate() {
  if (!selectedSemesterId.value || !autoSubjectId.value || !autoDateFrom.value || !autoDateTo.value) {
    toast.error('Select a semester, subject, and date range')
    return
  }
  const skipDates = autoPreview.value.filter(r => !r.selected).map(r => r.date)
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
    toast.success(`${result?.created ?? autoPreview.value.filter(r => r.selected).length} entries created`)
    router.push('/log')
  } catch {
    toast.error('Failed to generate entries')
  } finally {
    autoLoading.value = false
  }
}

function addRow() { rows.value.push(newRow()) }
function removeRow(index: number) { rows.value.splice(index, 1) }

function rowHours(row: SpreadsheetRow) {
  if (!row.start_time || !row.end_time) return ''
  const [sh, sm] = row.start_time.split(':').map(Number)
  const [eh, em] = row.end_time.split(':').map(Number)
  const minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes <= 0) return ''
  return (minutes / 60).toFixed(2) + 'h'
}

const validRowCount = computed(() =>
  rows.value.filter(r => r.date && r.start_time && r.end_time && r.activity && r.lecturer_name).length,
)

async function saveAll() {
  if (!selectedSemesterId.value) { toast.error('Select a semester first'); return }
  if (!validRowCount.value) { toast.error('Fill in at least one complete row'); return }
  saveLoading.value = true
  try {
    const entries = rows.value
      .filter(r => r.date && r.start_time && r.end_time && r.activity && r.lecturer_name)
      .map(r => ({
        subject_id: r.subject_id || undefined,
        log_date: r.date,
        start_time: r.start_time,
        end_time: r.end_time,
        activity: r.activity,
        lecturer_name: r.lecturer_name,
      }))
    const result = await apiFetch<{ created: number }>('/logs/batch', {
      method: 'POST',
      body: JSON.stringify({ semester_id: selectedSemesterId.value, entries }),
    })
    toast.success(`${result?.created ?? validRowCount.value} entries saved`)
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
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" />
      <h1 class="text-xl font-bold">Batch Log</h1>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" />
    </div>

    <template v-else>
      <div v-if="semesterOptions.length" class="flex flex-col gap-1 mb-4">
        <label class="text-sm font-medium text-[var(--muted)]">Semester</label>
        <Select v-model="selectedSemesterId" :options="semesterOptions" option-label="label" option-value="value" class="w-full" />
      </div>

      <SelectButton
        v-model="activeTab"
        :options="batchTabs"
        option-label="label"
        option-value="key"
        class="w-full mb-5"
      />

      <!-- Auto-Generate tab -->
      <div v-if="activeTab === 'auto'" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">TA Subject</label>
          <Select v-model="autoSubjectId" :options="subjectOptions" option-label="label" option-value="value" placeholder="Select subject" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">From</label>
            <DatePicker v-model="autoDateFromPicker" date-format="dd/mm/yy" show-icon fluid />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">To</label>
            <DatePicker v-model="autoDateToPicker" date-format="dd/mm/yy" show-icon fluid />
          </div>
        </div>

        <div v-if="autoPreview.length" class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div class="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
            <span class="text-sm font-semibold">Preview ({{ autoPreview.filter(r => r.selected).length }} selected)</span>
            <Button
              label="Toggle all"
              text
              size="small"
              @click="autoPreview.forEach(r => r.selected = !autoPreview.every(i => i.selected))"
            />
          </div>
          <div v-for="(row, index) in autoPreview" :key="index" class="flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-0 gap-3">
            <Checkbox v-model="row.selected" :binary="true" />
            <span class="text-sm flex-1" :class="!row.selected ? 'text-[var(--muted)] line-through' : ''">{{ formatPreviewDate(row.date) }}</span>
            <span class="text-xs text-[var(--muted)]">{{ row.hours }}h</span>
          </div>
        </div>

        <p v-else-if="autoSubjectId && autoDateFrom && autoDateTo" class="text-sm text-center text-[var(--muted)] py-4">
          No matching dates in range
        </p>

        <Button
          v-if="autoPreview.length"
          :loading="autoLoading"
          :label="`Generate ${autoPreview.filter(r => r.selected).length} entries`"
          fluid
          @click="confirmAutoGenerate"
        />
      </div>

      <!-- Spreadsheet tab -->
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
              <Button
                v-if="rows.length > 1"
                icon="pi pi-times"
                text
                severity="danger"
                size="small"
                @click="removeRow(index)"
              />
            </div>
          </div>

          <!-- Field order mirrors UCampus: Date → Start → End → Activity → Lecturer → Subject -->
          <div class="grid grid-cols-3 gap-2 mb-2">
            <DatePicker
              :model-value="row.date ? new Date(row.date + 'T00:00:00') : null"
              date-format="dd/mm/yy"
              show-icon
              fluid
              class="col-span-3"
              @update:model-value="(val: Date | null) => { row.date = val ? val.toISOString().slice(0, 10) : '' }"
            />
            <input
              v-model="row.start_time"
              type="time"
              placeholder="Start"
              class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm"
            />
            <input
              v-model="row.end_time"
              type="time"
              placeholder="End"
              class="px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm"
            />
            <Select
              v-model="row.activity"
              :options="activityOptions"
              option-label="label"
              option-value="value"
              placeholder="Activity"
              size="small"
              class="text-sm"
            />
            <input
              v-model="row.lecturer_name"
              placeholder="Lecturer"
              class="col-span-3 px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm"
            />
            <Select
              v-model="row.subject_id"
              :options="rowSubjectOptions"
              option-label="label"
              option-value="value"
              size="small"
              class="col-span-3 text-sm"
            />
          </div>
        </div>

        <Button label="Add row" icon="pi pi-plus" text @click="addRow" />

        <Button
          :loading="saveLoading"
          :label="`Save all (${validRowCount} valid)`"
          fluid
          @click="saveAll"
        />
      </div>
    </template>
  </div>
</template>
