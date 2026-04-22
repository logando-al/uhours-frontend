<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Batch Log — UHours' })

const { apiFetch } = useAuth()
const toast = useToast()
const router = useRouter()

type BatchTab = 'auto' | 'spreadsheet'
const activeTab = ref<BatchTab>('auto')

interface Subject {
  id: number
  name: string
  day_of_week: string
  start_time: string
  end_time: string
  lecturer: string
}

const subjects = ref<Subject[]>([])
const loading = ref(false)
const pageLoading = ref(true)

// Auto-generate state
const autoSubjectId = ref<number | null>(null)
const autoDateFrom = ref('')
const autoDateTo = ref('')
const autoPreview = ref<Array<{ date: string; selected: boolean; hours: string }>>([])
const autoLoading = ref(false)

// Spreadsheet state
interface SpreadsheetRow {
  date: string
  start_time: string
  end_time: string
  activity: string
  lecturer: string
  notes: string
}
const rows = ref<SpreadsheetRow[]>([newRow()])
const saveLoading = ref(false)

function newRow(): SpreadsheetRow {
  return { date: new Date().toISOString().slice(0, 10), start_time: '', end_time: '', activity: '', lecturer: '', notes: '' }
}

const subjectOptions = computed(() =>
  subjects.value.map(s => ({ value: s.id, label: `${s.name} (${s.day_of_week} ${s.start_time}–${s.end_time})` }))
)

const ACTIVITIES = ['Tutorial', 'Lab session', 'Marking', 'Consultation', 'Invigilation', 'Preparation', 'Meeting', 'Other']

onMounted(async () => {
  try {
    subjects.value = await apiFetch<Subject[]>('/subjects')
  } catch { /* handled */ } finally {
    pageLoading.value = false
  }
})

// Day name to JS day index (0=Sunday)
const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

function generatePreview() {
  if (!autoSubjectId.value || !autoDateFrom.value || !autoDateTo.value) return
  const subj = subjects.value.find(s => s.id === autoSubjectId.value)
  if (!subj) return

  const targetDay = DAY_MAP[subj.day_of_week.toLowerCase()]
  const from = new Date(autoDateFrom.value)
  const to = new Date(autoDateTo.value)
  const results: typeof autoPreview.value = []

  const cur = new Date(from)
  while (cur <= to) {
    if (cur.getDay() === targetDay) {
      const [sh, sm] = subj.start_time.split(':').map(Number)
      const [eh, em] = subj.end_time.split(':').map(Number)
      const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60
      results.push({
        date: cur.toISOString().slice(0, 10),
        selected: true,
        hours: hours.toFixed(2),
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
  autoPreview.value = results
}

watch([autoSubjectId, autoDateFrom, autoDateTo], generatePreview)

async function confirmAutoGenerate() {
  const selected = autoPreview.value.filter(r => r.selected)
  if (!selected.length) { toast.error('No entries selected'); return }
  const subj = subjects.value.find(s => s.id === autoSubjectId.value)!
  autoLoading.value = true
  try {
    await apiFetch('/logs/generate', {
      method: 'POST',
      body: JSON.stringify({
        subject_id: autoSubjectId.value,
        dates: selected.map(r => r.date),
      }),
    })
    toast.success(`${selected.length} entries created`)
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

function removeRow(i: number) {
  rows.value.splice(i, 1)
}

function rowHours(row: SpreadsheetRow) {
  if (!row.start_time || !row.end_time) return ''
  const [sh, sm] = row.start_time.split(':').map(Number)
  const [eh, em] = row.end_time.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  return (mins / 60).toFixed(2) + 'h'
}

async function saveAll() {
  const valid = rows.value.filter(r => r.date && r.start_time && r.end_time && r.activity)
  if (!valid.length) { toast.error('Fill in at least one complete row'); return }
  saveLoading.value = true
  try {
    await apiFetch('/logs/batch', {
      method: 'POST',
      body: JSON.stringify({ logs: valid }),
    })
    toast.success(`${valid.length} entries saved`)
    router.push('/log')
  } catch {
    toast.error('Failed to save batch')
  } finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <div class="flex items-center gap-3 mb-5">
      <button class="text-[var(--muted)] hover:text-[var(--fg)] p-1" @click="router.back()">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <h1 class="text-xl font-bold">Batch Log</h1>
    </div>

    <!-- Tabs -->
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

    <!-- Auto-Generate -->
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
          <span class="text-sm font-semibold">Preview ({{ autoPreview.filter(r => r.selected).length }} selected)</span>
          <button class="text-xs text-[var(--accent)] hover:underline" @click="autoPreview.forEach(r => r.selected = !autoPreview.every(r => r.selected))">
            Toggle all
          </button>
        </div>
        <div v-for="(row, i) in autoPreview" :key="i" class="flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-0 gap-3">
          <input v-model="row.selected" type="checkbox" class="w-4 h-4 accent-[var(--accent)]" />
          <span class="text-sm flex-1">{{ row.date }}</span>
          <span class="text-xs text-[var(--muted)]">{{ row.hours }}h</span>
        </div>
      </div>

      <div v-else-if="autoSubjectId && autoDateFrom && autoDateTo" class="text-sm text-center text-[var(--muted)] py-4">
        No matching dates in range
      </div>

      <BaseButton
        v-if="autoPreview.some(r => r.selected)"
        :loading="autoLoading"
        full-width
        @click="confirmAutoGenerate"
      >
        Generate {{ autoPreview.filter(r => r.selected).length }} entries
      </BaseButton>
    </div>

    <!-- Spreadsheet -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4"
      >
        <div class="flex justify-between items-center mb-3">
          <span class="text-xs font-semibold text-[var(--muted)]">Row {{ i + 1 }}</span>
          <div class="flex items-center gap-2">
            <span v-if="rowHours(row)" class="text-xs text-[var(--accent)]">{{ rowHours(row) }}</span>
            <button v-if="rows.length > 1" class="text-[var(--muted)] hover:text-red-400 p-1" @click="removeRow(i)">
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
            <option v-for="a in ACTIVITIES" :key="a" :value="a">{{ a }}</option>
          </select>
          <input v-model="row.lecturer" placeholder="Lecturer" class="col-span-2 px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
          <input v-model="row.notes" placeholder="Notes" class="col-span-3 px-3 py-2 rounded-lg bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" />
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
        Save all ({{ rows.filter(r => r.date && r.start_time && r.end_time && r.activity).length }} valid)
      </BaseButton>
    </div>

    <AppToast />
  </div>
</template>
