<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { logout, apiFetch } = useAuth()
const auth = useAuthStore()
const router = useRouter()

const selectedAvatar = computed(() => auth.user?.avatar ?? '🐻')

onMounted(async () => {
  try {
    const me = await apiFetch<{ avatar: string }>('/users/me')
    if (me?.avatar) auth.setAvatar(me.avatar)
  } catch {}
})

const popover = ref()

function toggle(event: Event) {
  popover.value?.toggle(event)
}

function goToChangePassword() {
  popover.value?.hide()
  router.push('/settings/change-password')
}

function handleLogout() {
  popover.value?.hide()
  logout()
}
</script>

<template>
  <button
    class="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--bg)] transition-all cursor-pointer"
    @click="toggle"
  >
    <span class="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-xl leading-none select-none">{{ selectedAvatar }}</span>
    <span class="text-sm font-medium text-[var(--fg)]">{{ auth.user?.username }}</span>
    <i class="pi pi-chevron-down text-[10px] text-[var(--muted)]" />
  </button>

  <Popover ref="popover">
    <div class="w-48 flex flex-col gap-0.5 py-1">
      <button
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg)] transition-all text-left w-full text-[var(--fg)] cursor-pointer"
        @click="goToChangePassword"
      >
        <i class="pi pi-key text-[var(--muted)] text-sm" />
        <span>Change Password</span>
      </button>
      <button
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg)] transition-all text-left w-full text-red-400 cursor-pointer"
        @click="handleLogout"
      >
        <i class="pi pi-sign-out text-sm" />
        <span>Sign Out</span>
      </button>
    </div>
  </Popover>
</template>
