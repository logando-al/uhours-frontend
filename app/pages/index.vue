<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  auth.rehydrate()
  navigateTo(auth.isAuthenticated ? '/dashboard' : '/login', { replace: true })
})
</script>

<template>
  <div class="flex items-center justify-center min-h-dvh">
    <div class="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
  </div>
</template>
