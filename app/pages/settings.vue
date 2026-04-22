<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Settings — UHours' })

const { apiFetch, logout } = useAuth()
const toast = useToast()
const { theme, setTheme, init } = useTheme()

onMounted(init)

// Theme
type ThemeMode = 'dark' | 'light' | 'system'
const themeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
]

// Change password — step 1: verify current password + turnstile → get TAC
// step 2: enter TAC + new password
const pwStep = ref<1 | 2>(1)
const pwLoading = ref(false)
const currentPassword = ref('')
const turnstileToken = ref('')
const tacCells = ref<string[]>(Array(6).fill(''))
const newPassword = ref('')
const tacError = ref('')
const tacShake = ref(false)
const pwError = ref('')
const cellRefs: Ref<HTMLInputElement | null>[] = Array.from({ length: 6 }, () => ref(null))

async function requestPasswordChange() {
  pwError.value = ''
  if (!currentPassword.value) { pwError.value = 'Enter your current password'; return }
  if (!turnstileToken.value) { toast.error('Complete the verification'); return }
  pwLoading.value = true
  try {
    await apiFetch('/auth/change-password/request', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword.value, turnstile_token: turnstileToken.value }),
    })
    pwStep.value = 2
    await nextTick()
    cellRefs[0].value?.focus()
  } catch {
    pwError.value = 'Incorrect password'
  } finally {
    pwLoading.value = false
  }
}

function onCellInput(index: number, event: Event) {
  const val = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1)
  tacCells.value[index] = val
  if (val && index < 5) cellRefs[index + 1].value?.focus()
}

function onCellKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !tacCells.value[index] && index > 0) cellRefs[index - 1].value?.focus()
}

async function confirmPasswordChange() {
  tacError.value = ''
  const tac = tacCells.value.join('')
  if (tac.length !== 6) { tacError.value = 'Enter the 6-digit code'; return }
  if (newPassword.value.length < 8) { toast.error('New password must be at least 8 characters'); return }
  pwLoading.value = true
  try {
    await apiFetch('/auth/change-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ tac, new_password: newPassword.value }),
    })
    toast.success('Password changed — please sign in again')
    logout()
  } catch {
    tacError.value = 'Invalid or expired code'
    tacShake.value = true
    setTimeout(() => { tacShake.value = false }, 600)
    tacCells.value = Array(6).fill('')
  } finally {
    pwLoading.value = false
  }
}

// Semester management
interface Semester {
  id: number
  name: string
  is_active: boolean
}
const semesters = ref<Semester[]>([])
const semesterLoading = ref(true)
const newSemesterName = ref('')
const semFormLoading = ref(false)

async function loadSemesters() {
  semesterLoading.value = true
  try {
    semesters.value = await apiFetch<Semester[]>('/semesters')
  } catch { /* handled */ } finally {
    semesterLoading.value = false
  }
}

async function addSemester() {
  if (!newSemesterName.value.trim()) return
  semFormLoading.value = true
  try {
    const created = await apiFetch<Semester>('/semesters', {
      method: 'POST',
      body: JSON.stringify({ name: newSemesterName.value.trim() }),
    })
    semesters.value.push(created)
    newSemesterName.value = ''
    toast.success('Semester added')
  } catch {
    toast.error('Failed to add semester')
  } finally {
    semFormLoading.value = false
  }
}

async function setActiveSemester(id: number) {
  try {
    await apiFetch(`/semesters/${id}/activate`, { method: 'PATCH' })
    semesters.value.forEach(s => { s.is_active = s.id === id })
    toast.success('Active semester updated')
  } catch {
    toast.error('Failed to update')
  }
}

async function deleteSemester(id: number) {
  if (!confirm('Delete this semester? All associated data will be removed.')) return
  try {
    await apiFetch(`/semesters/${id}`, { method: 'DELETE' })
    semesters.value = semesters.value.filter(s => s.id !== id)
    toast.success('Semester deleted')
  } catch {
    toast.error('Failed to delete')
  }
}

onMounted(loadSemesters)
</script>

<template>
  <div class="min-h-dvh pb-28 px-4 pt-6 max-w-[480px] mx-auto">
    <h1 class="text-xl font-bold mb-6">Settings</h1>

    <!-- Theme -->
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

    <!-- Change password -->
    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Change Password</h2>

      <!-- Step 1 -->
      <form v-if="pwStep === 1" class="flex flex-col gap-3" @submit.prevent="requestPasswordChange">
        <BaseInput
          v-model="currentPassword"
          label="Current password"
          type="password"
          placeholder="Enter current password"
          :error="pwError"
          required
        />
        <TurnstileWidget @verified="turnstileToken = $event" @error="turnstileToken = ''" />
        <BaseButton type="submit" :loading="pwLoading" full-width class="mt-1">Send code to Telegram</BaseButton>
      </form>

      <!-- Step 2 -->
      <form v-else class="flex flex-col gap-3" @submit.prevent="confirmPasswordChange">
        <p class="text-sm text-[var(--muted)]">Enter the 6-digit code sent to your Telegram</p>
        <div class="flex gap-2 justify-center" :class="tacShake && 'animate-shake'">
          <input
            v-for="(_, i) in tacCells"
            :key="i"
            :ref="(el) => { cellRefs[i].value = el as HTMLInputElement }"
            v-model="tacCells[i]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="w-10 h-12 text-center text-lg font-bold rounded-xl border bg-[var(--bg)] outline-none transition-all"
            :class="tacError ? 'border-red-500 text-red-400' : 'border-[var(--border)] focus:border-[var(--accent)] text-[var(--fg)]'"
            @input="onCellInput(i, $event)"
            @keydown="onCellKeydown(i, $event)"
          />
        </div>
        <p v-if="tacError" class="text-sm text-red-400 text-center">{{ tacError }}</p>
        <BaseInput v-model="newPassword" label="New password" type="password" placeholder="Min. 8 characters" required />
        <BaseButton type="submit" :loading="pwLoading" full-width>Change password</BaseButton>
        <button type="button" class="text-sm text-[var(--muted)] text-center hover:text-[var(--fg)]" @click="pwStep = 1">
          Back
        </button>
      </form>
    </section>

    <!-- Semester management -->
    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <h2 class="font-semibold mb-3">Semesters</h2>

      <div v-if="semesterLoading" class="flex justify-center py-4">
        <div class="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>

      <div v-else class="flex flex-col gap-2 mb-3">
        <div
          v-for="sem in semesters"
          :key="sem.id"
          class="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0"
        >
          <div class="flex-1">
            <span class="text-sm font-medium">{{ sem.name }}</span>
            <span v-if="sem.is_active" class="ml-2 text-xs text-green-400">Active</span>
          </div>
          <button v-if="!sem.is_active" class="text-xs text-[var(--accent)] hover:underline" @click="setActiveSemester(sem.id)">Set active</button>
          <button class="text-[var(--muted)] hover:text-red-400 p-1" @click="deleteSemester(sem.id)">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
          </button>
        </div>
        <p v-if="semesters.length === 0" class="text-sm text-[var(--muted)]">No semesters yet</p>
      </div>

      <div class="flex gap-2">
        <input v-model="newSemesterName" placeholder="Semester name" class="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm" @keyup.enter="addSemester" />
        <BaseButton :loading="semFormLoading" @click="addSemester">Add</BaseButton>
      </div>
    </section>

    <!-- Sign out -->
    <BaseButton variant="ghost" full-width class="text-red-400 hover:text-red-300" @click="logout">
      Sign out
    </BaseButton>

    <AppNav />
    <AppToast />
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.animate-shake { animation: shake 0.5s ease-in-out; }
</style>
