<script setup lang="ts">
const route = useRoute()

const leftTabs = [
  { label: 'Dashboard', icon: 'grid', to: '/dashboard' },
  { label: 'Log', icon: 'clock', to: '/log' },
]

const rightTabs = [
  { label: 'Subjects', icon: 'book', to: '/subjects' },
  { label: 'Settings', icon: 'settings', to: '/settings' },
]

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <nav class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[448px] md:hidden">
    <div class="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-2 py-2 shadow-xl backdrop-blur-md">
      <!-- Left tabs -->
      <NuxtLink
        v-for="tab in leftTabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all flex-1"
        :class="isActive(tab.to)
          ? 'text-[var(--accent)] bg-[var(--accent)]/10'
          : 'text-[var(--muted)] hover:text-[var(--fg)]'"
      >
        <svg v-if="tab.icon === 'grid'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <svg v-else-if="tab.icon === 'clock'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span class="text-xs font-medium">{{ tab.label }}</span>
      </NuxtLink>

      <!-- Center + button -->
      <div class="flex items-center justify-center px-2 flex-shrink-0">
        <NuxtLink
          to="/log/add"
          class="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all -mt-8"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </NuxtLink>
      </div>

      <!-- Right tabs -->
      <NuxtLink
        v-for="tab in rightTabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all flex-1"
        :class="isActive(tab.to)
          ? 'text-[var(--accent)] bg-[var(--accent)]/10'
          : 'text-[var(--muted)] hover:text-[var(--fg)]'"
      >
        <svg v-if="tab.icon === 'book'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <svg v-else-if="tab.icon === 'settings'" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span class="text-xs font-medium">{{ tab.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
