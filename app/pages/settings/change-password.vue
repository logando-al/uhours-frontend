<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Change Password — UHours' })

const { apiFetch, logout } = useAuth()
const toast = useAppToast()
const router = useRouter()

const step = ref<1 | 2>(1)
const loading = ref(false)
const currentPassword = ref('')
const turnstileToken = ref('')
const tacCells = ref<string[]>(Array(6).fill(''))
const newPassword = ref('')
const tacError = ref('')
const tacShake = ref(false)
const passwordError = ref('')
const cellRefs: Ref<HTMLInputElement | null>[] = Array.from({ length: 6 }, () => ref(null))

async function requestPasswordChange() {
  passwordError.value = ''
  if (!currentPassword.value) {
    passwordError.value = 'Enter your current password'
    return
  }
  if (!turnstileToken.value) {
    toast.error('Complete the verification')
    return
  }

  loading.value = true
  try {
    await apiFetch('/auth/change-password/request', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword.value, turnstile_token: turnstileToken.value }),
    })
    step.value = 2
    await nextTick()
    cellRefs[0].value?.focus()
  } catch (error: any) {
    passwordError.value = error?.message ?? 'Incorrect password'
  } finally {
    loading.value = false
  }
}

function onCellInput(index: number, event: Event) {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1)
  tacCells.value[index] = value
  if (value && index < 5) cellRefs[index + 1].value?.focus()
}

function onCellKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !tacCells.value[index] && index > 0) cellRefs[index - 1].value?.focus()
}

async function confirmPasswordChange() {
  tacError.value = ''
  const tac = tacCells.value.join('')
  if (tac.length !== 6) {
    tacError.value = 'Enter the 6-digit code'
    return
  }
  if (newPassword.value.length < 8) {
    toast.error('New password must be at least 8 characters')
    return
  }

  loading.value = true
  try {
    await apiFetch('/auth/change-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ tac, new_password: newPassword.value }),
    })
    toast.success('Password changed — please sign in again')
    await logout()
  } catch {
    tacError.value = 'Invalid or expired code'
    tacShake.value = true
    setTimeout(() => { tacShake.value = false }, 600)
    tacCells.value = Array(6).fill('')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="pb-28 md:pb-8 px-4 md:px-8 pt-6 md:pt-8 max-w-[480px] md:max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.push('/settings')" />
      <h1 class="text-xl font-bold">Change Password</h1>
    </div>

    <section class="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] mb-4">
      <form v-if="step === 1" class="flex flex-col gap-3" @submit.prevent="requestPasswordChange">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">Current password</label>
          <Password v-model="currentPassword" placeholder="Enter current password" :feedback="false" toggle-mask fluid :invalid="!!passwordError" />
          <small v-if="passwordError" class="text-red-400">{{ passwordError }}</small>
        </div>
        <TurnstileWidget v-model="turnstileToken" />
        <Button type="submit" :loading="loading" label="Send code to Telegram" fluid class="mt-1" />
      </form>

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
        <small v-if="tacError" class="text-red-400 text-center block">{{ tacError }}</small>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-[var(--muted)]">New password</label>
          <Password v-model="newPassword" placeholder="Min. 8 characters" :feedback="false" toggle-mask fluid />
        </div>
        <Button type="submit" :loading="loading" label="Change password" fluid />
        <Button type="button" label="Back" text severity="secondary" fluid @click="step = 1" />
      </form>
    </section>

    <AppNav />
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
