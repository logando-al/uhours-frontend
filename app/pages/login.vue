<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign In — UHours' })

const config = useRuntimeConfig()
const router = useRouter()
const toast = useAppToast()
const auth = useAuthStore()

onMounted(() => {
  auth.rehydrate()
  if (auth.isAuthenticated) router.replace('/dashboard')
})

const form = reactive({ username: '', password: '', turnstileToken: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.username.trim()) errors.username = 'Username is required'
  if (!form.password) errors.password = 'Password is required'
  if (!form.turnstileToken) errors.turnstile = 'Please complete the verification'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        turnstile_token: form.turnstileToken,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const code = data?.error?.code
      if (code === 'TURNSTILE_FAILED') {
        toast.error('Verification failed. Please try again.')
      } else if (code === 'ACCOUNT_NOT_VERIFIED') {
        toast.error('Your account is not verified yet. Complete the Telegram code step first.')
      } else {
        toast.error('Invalid username or password')
      }
      return
    }
    auth.setAuth(data.data.access_token, data.data.user)
    router.replace('/dashboard')
  } catch {
    toast.error('Network error — please try again')
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
        <p class="text-sm text-[var(--muted)] mt-1">TA Hours Monitoring</p>
      </div>

      <div class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)]">
        <h2 class="text-lg font-semibold mb-5">Sign in</h2>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">Username</label>
            <InputText v-model="form.username" placeholder="your_username" fluid :invalid="!!errors.username" />
            <small v-if="errors.username" class="text-red-400">{{ errors.username }}</small>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-[var(--muted)]">Password</label>
            <Password v-model="form.password" placeholder="Your password" :feedback="false" toggle-mask fluid :invalid="!!errors.password" />
            <small v-if="errors.password" class="text-red-400">{{ errors.password }}</small>
          </div>

          <TurnstileWidget v-model="form.turnstileToken" />
          <small v-if="errors.turnstile" class="text-red-400 text-center block">{{ errors.turnstile }}</small>

          <Button type="submit" :loading="loading" label="Sign in" fluid class="mt-1" />
        </form>

        <div class="flex justify-between text-sm mt-4">
          <NuxtLink to="/register" class="text-[var(--accent)] hover:underline">Create account</NuxtLink>
          <NuxtLink to="/forgot-password" class="text-[var(--muted)] hover:text-[var(--fg)]">Forgot password?</NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
