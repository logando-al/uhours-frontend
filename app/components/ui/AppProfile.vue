<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { logout } = useAuth()
const auth = useAuthStore()
const router = useRouter()

const AVATARS = [
  '🐻', '🦊', '🐧', '🦁', '🐸', '🦋',
  '🐺', '🦄', '🐯', '🐮', '🐙', '🦅',
  '🐬', '🦀', '🐲', '🦉', '🐼', '🦩',
]

const selectedAvatar = ref('🐻')

onMounted(() => {
  selectedAvatar.value = localStorage.getItem('uhours-avatar') ?? '🐻'
})

function setAvatar(avatar: string) {
  selectedAvatar.value = avatar
  localStorage.setItem('uhours-avatar', avatar)
}

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
    <span class="text-2xl leading-none select-none">{{ selectedAvatar }}</span>
    <span class="text-sm font-medium text-[var(--fg)]">{{ auth.user?.username }}</span>
    <i class="pi pi-chevron-down text-[10px] text-[var(--muted)]" />
  </button>

  <Popover ref="popover">
    <div class="w-56 flex flex-col gap-3 py-1">
      <div>
        <p class="text-[11px] font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider px-1">Avatar</p>
        <div class="grid grid-cols-6 gap-1">
          <button
            v-for="avatar in AVATARS"
            :key="avatar"
            class="text-xl p-1.5 rounded-lg transition-all hover:bg-[var(--bg)] text-center cursor-pointer"
            :class="selectedAvatar === avatar ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10' : ''"
            @click="setAvatar(avatar)"
          >
            {{ avatar }}
          </button>
        </div>
      </div>

      <Divider class="!my-0" />

      <div class="flex flex-col gap-0.5">
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
    </div>
  </Popover>
</template>
