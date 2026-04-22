<script setup lang="ts">
useHead({ title: 'Forgot Password — UHours' })

const config = useRuntimeConfig()
const router = useRouter()
const toast = useToast()

const step = ref<1 | 2>(1)
const loading = ref(false)

// Step 1
const username = ref('')
const turnstileToken = ref('')
const usernameError = ref('')

// Step 2
const tacCells = ref<string[]>(Array(6).fill(''))
const newPassword = ref('')
const tacError = ref('')
const tacShake = ref(false)
const passwordError = ref('')
const cellRefs: Ref<HTMLInputElement | null>[] = Array.from({ length: 6 }, () => ref(null))

async function submitForgot() {
  usernameError.value = ''
  if (!username.value.trim()) { usernameError.value = 'Username is required'; return }
  if (!turnstileToken.value) { toast.error('Please complete the verification'); return }
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), turnstile_token: turnstileToken.value }),
    })
    if (!res.ok) {
      toast.error('Verification failed. Please try again.')
      return
    }
    // Always show step 2 (do not reveal if user exists)
    step.value = 2
    await nextTick()
    cellRefs[0].value?.focus()
  } catch {
    toast.error('Network error')
  } finally {
    loading.value = false
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

async function submitReset() {
  tacError.value = ''
  passwordError.value = ''
  const tac = tacCells.value.join('')
  if (tac.length !== 6) { tacError.value = 'Enter the 6-digit code'; return }
  if (newPassword.value.length < 8) { passwordError.value = 'Password must be at least 8 characters'; return }
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value.trim(), tac, new_password: newPassword.value }),
    })
    if (!res.ok) {
      tacError.value = 'Invalid or expired code'
      tacShake.value = true
      setTimeout(() => { tacShake.value = false }, 600)
      tacCells.value = Array(6).fill('')
      return
    }
    toast.success('Password reset — please sign in')
    router.push('/login')
  } catch {
    toast.error('Network error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">

      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--fg)]">UHours</h1>
      </div>

      <!-- Step 1 -->
      <div v-if="step === 1" class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 class="text-lg font-semibold mb-1">Reset password</h2>
        <p class="text-sm text-[var(--muted)] mb-5">We'll send a code to your Telegram</p>

        <form class="flex flex-col gap-4" @submit.prevent="submitForgot">
          <BaseInput v-model="username" label="Username" placeholder="your_username" :error="usernameError" required />
          <TurnstileWidget v-model="turnstileToken" />
          <BaseButton type="submit" :loading="loading" full-width class="mt-1">Send code</BaseButton>
        </form>

        <p class="text-center text-sm mt-4">
          <NuxtLink to="/login" class="text-[var(--accent)] hover:underline">Back to sign in</NuxtLink>
        </p>
      </div>

      <!-- Step 2 -->
      <div v-else class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 class="text-lg font-semibold mb-1">Enter code</h2>
        <p class="text-sm text-[var(--muted)] mb-5">Check your Telegram for the 6-digit code</p>

        <form class="flex flex-col gap-4" @submit.prevent="submitReset">
          <div class="flex gap-2 justify-center" :class="tacShake && 'animate-shake'">
            <input
              v-for="(_, i) in tacCells"
              :key="i"
              :ref="(el) => { cellRefs[i].value = el as HTMLInputElement }"
              v-model="tacCells[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="w-11 h-14 text-center text-xl font-bold rounded-xl border bg-[var(--bg)] outline-none transition-all"
              :class="tacError ? 'border-red-500 text-red-400' : 'border-[var(--border)] focus:border-[var(--accent)] text-[var(--fg)]'"
              @input="onCellInput(i, $event)"
              @keydown="onCellKeydown(i, $event)"
            />
          </div>
          <p v-if="tacError" class="text-sm text-red-400 text-center">{{ tacError }}</p>

          <BaseInput v-model="newPassword" label="New password" type="password" placeholder="Min. 8 characters" :error="passwordError" required />
          <BaseButton type="submit" :loading="loading" full-width>Reset password</BaseButton>
        </form>
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
</style>
