<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const { logout } = useAuth()
const auth = useAuthStore()

const navItems = [
  { label: 'Dashboard', icon: 'grid', to: '/dashboard' },
  { label: 'Log', icon: 'clock', to: '/log' },
  { label: 'Subjects', icon: 'book', to: '/subjects' },
  { label: 'Settings', icon: 'settings', to: '/settings' },
]

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <aside class="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)] sticky top-0 h-dvh overflow-y-auto">
    <div class="px-6 py-5 border-b border-[var(--border)]">
      <p class="text-base font-bold text-[var(--fg)]">UHours</p>
      <p class="text-xs text-[var(--muted)] mt-0.5">TA Hours Monitoring</p>
    </div>

    <nav class="flex-1 px-3 py-4 flex flex-col gap-0.5">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
        :class="isActive(item.to)
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg)]'"
      >
        <svg v-if="item.icon === 'grid'" class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <svg v-else-if="item.icon === 'clock'" class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <svg v-else-if="item.icon === 'book'" class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <svg v-else-if="item.icon === 'settings'" class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="px-4 py-4 border-t border-[var(--border)]">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-medium text-[var(--fg)] truncate">{{ auth.user?.username }}</p>
          <p class="text-xs text-[var(--muted)]">Teaching Assistant</p>
        </div>
        <button
          class="shrink-0 text-[var(--muted)] hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-900/20"
          title="Sign out"
          @click="logout()"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
