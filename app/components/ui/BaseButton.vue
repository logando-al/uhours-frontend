<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] px-6 py-3"
    :class="[
      variant === 'primary' && 'bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.98]',
      variant === 'secondary' && 'bg-[var(--bg-card)] text-[var(--fg)] border border-[var(--border)] hover:border-[var(--accent)]',
      variant === 'ghost' && 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)]',
      fullWidth && 'w-full',
    ]"
  >
    <svg v-if="loading" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>
