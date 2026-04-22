<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Register — UHours' })

const config = useRuntimeConfig()
const router = useRouter()
const toast = useAppToast()
const auth = useAuthStore()

// Redirect if already authenticated
onMounted(() => {
  auth.rehydrate()
  if (auth.isAuthenticated) router.replace('/dashboard')
})

// Step state: 1 = registration form, 2 = TAC entry
const step = ref<1 | 2>(1)
const loading = ref(false)

// Step 1 form
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  telegramUsername: '',
  turnstileToken: '',
})
const errors = reactive<Record<string, string>>({})

// Step 2 state
const tacCells = ref<string[]>(Array(6).fill(''))
const tacError = ref('')
const tacShake = ref(false)
const countdown = ref(60)
const canResend = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// OTP cell refs
const cellRefs: Ref<HTMLInputElement | null>[] = Array.from({ length: 6 }, () => ref(null))

function startCountdown() {
  countdown.value = 60
  canResend.value = false
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      canResend.value = true
    }
  }, 1000)
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function validateStep1() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.username.trim()) errors.username = 'Username is required'
  else if (form.username.length < 3) errors.username = 'Username must be at least 3 characters'
  if (!form.password) errors.password = 'Password is required'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (!form.confirmPassword) errors.confirmPassword = 'Please retype your password'
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match'
  if (!form.telegramUsername.trim()) errors.telegramUsername = 'Telegram username is required'
  if (!form.turnstileToken) errors.turnstile = 'Please complete the Turnstile verification'
  return Object.keys(errors).length === 0
}

async function submitRegistration() {
  if (!validateStep1()) return
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        telegram_username: form.telegramUsername.replace(/^@/, ''),
        turnstile_token: form.turnstileToken,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const code = data?.error?.code
      if (code === 'TELEGRAM_NOT_FOUND') {
        errors.telegramUsername = 'Bot not found — send /start to @uhours_bot first'
      } else if (code === 'USERNAME_TAKEN') {
        errors.username = 'Username already taken'
      } else if (code === 'TURNSTILE_FAILED') {
        errors.turnstile = 'Verification failed. Please try again.'
      } else {
        toast.error(data?.error?.message ?? 'Registration failed')
      }
      return
    }
    step.value = 2
    startCountdown()
    await nextTick()
    cellRefs[0].value?.focus()
  } catch {
    toast.error('Network error — please try again')
  } finally {
    loading.value = false
  }
}

function onCellInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const val = input.value.replace(/\D/g, '').slice(-1)
  tacCells.value[index] = val
  if (val && index < 5) {
    cellRefs[index + 1].value?.focus()
  }
  if (tacCells.value.every(c => c !== '')) {
    submitTAC()
  }
}

function onCellKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !tacCells.value[index] && index > 0) {
    cellRefs[index - 1].value?.focus()
  }
}

function onCellPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? ''
  const digits = text.replace(/\D/g, '').slice(0, 6)
  if (digits.length === 6) {
    event.preventDefault()
    digits.split('').forEach((d, i) => { tacCells.value[i] = d })
    cellRefs[5].value?.focus()
    submitTAC()
  }
}

async function submitTAC() {
  const tac = tacCells.value.join('')
  if (tac.length !== 6) return
  loading.value = true
  tacError.value = ''
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/verify-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: form.username.trim(), tac }),
    })
    const data = await res.json()
    if (!res.ok) {
      tacError.value = 'Invalid code — check your Telegram and try again'
      triggerShake()
      tacCells.value = Array(6).fill('')
      await nextTick()
      cellRefs[0].value?.focus()
      return
    }
    // Success — set auth and redirect
    auth.setAuth(data.data.access_token, data.data.user)
    showSuccess.value = true
    setTimeout(() => router.push('/dashboard'), 1200)
  } catch {
    toast.error('Network error — please try again')
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  if (!canResend.value) return
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        telegram_username: form.telegramUsername.replace(/^@/, ''),
        turnstile_token: form.turnstileToken,
      }),
    })
    if (res.ok) {
      toast.success('New code sent to your Telegram')
      startCountdown()
    } else {
      toast.error('Failed to resend code')
    }
  } catch {
    toast.error('Network error')
  } finally {
    loading.value = false
  }
}

function triggerShake() {
  tacShake.value = true
  setTimeout(() => { tacShake.value = false }, 600)
}

const showSuccess = ref(false)
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">

      <!-- App name -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--fg)]">UHours</h1>
        <p class="text-sm text-[var(--muted)] mt-1">TA Hours Monitoring</p>
      </div>

      <!-- Step 1 — Registration Form -->
      <div v-if="step === 1" class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 class="text-lg font-semibold mb-1">Create account</h2>
        <p class="text-sm text-[var(--muted)] mb-5">Track your TA hours with ease</p>

        <!-- Telegram notice -->
        <div class="rounded-xl p-3 mb-5 text-sm border" :style="{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)', color: 'var(--info-text)' }">
          <p class="font-semibold mb-1" :style="{ color: 'var(--info-strong)' }">Before you register:</p>
          <p>
            Open
            <a href="https://t.me/uhours_bot" target="_blank" class="underline font-semibold" :style="{ color: 'var(--accent)' }">@uhours_bot</a>
            on Telegram and send
            <code class="px-1.5 py-0.5 rounded font-semibold" :style="{ backgroundColor: 'var(--info-chip)', color: 'var(--info-strong)' }">/start</code>
            so the bot can recognize your account first.
          </p>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="submitRegistration">
          <BaseInput
            v-model="form.username"
            label="Username"
            placeholder="your_username"
            :error="errors.username"
            required
          />
          <BaseInput
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            :error="errors.password"
            required
          />
          <BaseInput
            v-model="form.confirmPassword"
            label="Confirm password"
            type="password"
            placeholder="Retype your password"
            :error="errors.confirmPassword"
            required
          />
          <BaseInput
            v-model="form.telegramUsername"
            label="Telegram username"
            placeholder="@your_handle"
            :error="errors.telegramUsername"
            required
          />

          <TurnstileWidget v-model="form.turnstileToken" />
          <p v-if="errors.turnstile" class="text-sm text-red-400 text-center">{{ errors.turnstile }}</p>

          <BaseButton type="submit" :loading="loading" full-width class="mt-1">
            Register
          </BaseButton>
        </form>

        <p class="text-center text-sm text-[var(--muted)] mt-4">
          Already have an account?
          <NuxtLink to="/login" class="text-[var(--accent)] hover:underline">Sign in</NuxtLink>
        </p>
      </div>

      <!-- Step 2 — TAC Entry -->
      <div v-else-if="step === 2" class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">

        <!-- Success state -->
        <Transition name="fade">
          <div v-if="showSuccess" class="text-center py-4">
            <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p class="font-semibold text-green-400">Verified!</p>
            <p class="text-sm text-[var(--muted)]">Redirecting to dashboard…</p>
          </div>
        </Transition>

        <div v-if="!showSuccess">
          <div class="text-center mb-6">
            <div class="w-12 h-12 rounded-full bg-[var(--accent)]/20 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-[var(--accent)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold">Check your Telegram</h2>
            <p class="text-sm text-[var(--muted)] mt-1">Enter the 6-digit code sent to <strong>@{{ form.telegramUsername.replace('@', '') }}</strong></p>
          </div>

          <!-- OTP cells -->
          <div
            class="flex gap-2 justify-center mb-2"
            :class="tacShake && 'animate-shake'"
          >
            <input
              v-for="(_, i) in tacCells"
              :key="i"
              :ref="(el) => { cellRefs[i].value = el as HTMLInputElement }"
              v-model="tacCells[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="w-11 h-14 text-center text-xl font-bold rounded-xl border bg-[var(--bg)] outline-none transition-all"
              :class="[
                tacError
                  ? 'border-red-500 text-red-400'
                  : 'border-[var(--border)] focus:border-[var(--accent)] text-[var(--fg)]',
              ]"
              @input="onCellInput(i, $event)"
              @keydown="onCellKeydown(i, $event)"
              @paste="onCellPaste"
            />
          </div>

          <p v-if="tacError" class="text-sm text-red-400 text-center mb-4">{{ tacError }}</p>

          <!-- Countdown -->
          <div class="text-center mb-4">
            <p v-if="!canResend" class="text-sm text-[var(--muted)]">
              Code expires in <span class="font-mono font-semibold text-[var(--fg)]">{{ countdown }}s</span>
            </p>
            <button
              v-else
              class="text-sm text-[var(--accent)] hover:underline"
              :disabled="loading"
              @click="resendCode"
            >
              Resend code
            </button>
          </div>

          <button
            class="text-sm text-[var(--muted)] hover:text-[var(--fg)] flex items-center gap-1 mx-auto transition-colors"
            @click="step = 1"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
            Back to form
          </button>
        </div>
      </div>

    </div>
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

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
