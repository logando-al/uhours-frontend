<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign In — UHours' })

const config = useRuntimeConfig()
const router = useRouter()
const toast = useToast()
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
          <BaseInput v-model="form.username" label="Username" placeholder="your_username" :error="errors.username" required />
          <BaseInput v-model="form.password" label="Password" type="password" placeholder="Your password" :error="errors.password" required />

          <TurnstileWidget v-model="form.turnstileToken" />
          <p v-if="errors.turnstile" class="text-sm text-red-400 text-center">{{ errors.turnstile }}</p>

          <BaseButton type="submit" :loading="loading" full-width class="mt-1">Sign in</BaseButton>
        </form>

        <div class="flex justify-between text-sm mt-4">
          <NuxtLink to="/register" class="text-[var(--accent)] hover:underline">Create account</NuxtLink>
          <NuxtLink to="/forgot-password" class="text-[var(--muted)] hover:text-[var(--fg)]">Forgot password?</NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
