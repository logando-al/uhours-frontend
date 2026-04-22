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

function haptic() {
  if ('vibrate' in navigator) navigator.vibrate(8)
}
</script>

<template>
  <nav
    class="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[448px] md:hidden"
    style="will-change: transform;"
  >
    <div class="flex items-center bg-[var(--bg-card)]/95 border border-[var(--border)] rounded-2xl px-2 py-2 shadow-xl shadow-black/10 backdrop-blur-xl">

      <!-- Left tabs -->
      <NuxtLink
        v-for="tab in leftTabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center gap-0.5 py-1.5 flex-1 rounded-xl select-none touch-manipulation transition-transform duration-100 ease-out active:scale-90"
        :class="isActive(tab.to) ? 'text-[var(--accent)]' : 'text-[var(--muted)]'"
        @click="haptic"
      >
        <!-- Icon + pill bg -->
        <div class="relative flex items-center justify-center w-10 h-6">
          <div
            class="absolute inset-0 rounded-full transition-all duration-200 ease-out"
            :class="isActive(tab.to) ? 'bg-[var(--accent)]/12 opacity-100 scale-100' : 'bg-[var(--accent)]/0 opacity-0 scale-50'"
          />
          <svg
            v-if="tab.icon === 'grid'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="w-5 h-5 relative z-10 transition-transform duration-300"
            :class="isActive(tab.to) ? 'scale-110' : 'scale-100'"
            style="transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
          >
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <svg
            v-else-if="tab.icon === 'clock'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="w-5 h-5 relative z-10 transition-transform duration-300"
            :class="isActive(tab.to) ? 'scale-110' : 'scale-100'"
            style="transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
          >
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <!-- Label -->
        <span
          class="text-[10px] leading-none transition-all duration-200"
          :class="isActive(tab.to) ? 'font-semibold opacity-100' : 'font-medium opacity-50'"
        >{{ tab.label }}</span>
      </NuxtLink>

      <!-- Center FAB -->
      <div class="flex items-center justify-center px-2 flex-shrink-0">
        <NuxtLink
          to="/log/add"
          class="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center
                 shadow-lg shadow-[var(--accent)]/25
                 transition-all duration-150 ease-out
                 active:scale-90 active:shadow-md
                 select-none touch-manipulation -mt-8"
          @click="haptic"
        >
          <svg
            class="w-6 h-6 transition-transform duration-300"
            style="transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </NuxtLink>
      </div>

      <!-- Right tabs -->
      <NuxtLink
        v-for="tab in rightTabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center gap-0.5 py-1.5 flex-1 rounded-xl select-none touch-manipulation transition-transform duration-100 ease-out active:scale-90"
        :class="isActive(tab.to) ? 'text-[var(--accent)]' : 'text-[var(--muted)]'"
        @click="haptic"
      >
        <!-- Icon + pill bg -->
        <div class="relative flex items-center justify-center w-10 h-6">
          <div
            class="absolute inset-0 rounded-full transition-all duration-200 ease-out"
            :class="isActive(tab.to) ? 'bg-[var(--accent)]/12 opacity-100 scale-100' : 'bg-[var(--accent)]/0 opacity-0 scale-50'"
          />
          <svg
            v-if="tab.icon === 'book'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="w-5 h-5 relative z-10 transition-transform duration-300"
            :class="isActive(tab.to) ? 'scale-110' : 'scale-100'"
            style="transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <svg
            v-else-if="tab.icon === 'settings'"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            class="w-5 h-5 relative z-10 transition-transform duration-300"
            :class="isActive(tab.to) ? 'scale-110' : 'scale-100'"
            style="transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
          >
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>

        <!-- Label -->
        <span
          class="text-[10px] leading-none transition-all duration-200"
          :class="isActive(tab.to) ? 'font-semibold opacity-100' : 'font-medium opacity-50'"
        >{{ tab.label }}</span>
      </NuxtLink>

    </div>
  </nav>
</template>
