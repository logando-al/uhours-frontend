<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  options: Array<{ value: string | number; label: string }>
  placeholder?: string
  error?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium" :class="error ? 'text-red-400' : 'text-[var(--muted)]'">
      {{ label }}
    </label>
    <div class="relative">
      <select
        :value="modelValue"
        :disabled="disabled"
        class="w-full px-4 py-3 pr-10 rounded-xl bg-[var(--bg)] text-[var(--fg)] border outline-none appearance-none transition-all cursor-pointer"
        :class="[
          error
            ? 'border-red-500 focus:border-red-400'
            : 'border-[var(--border)] focus:border-[var(--accent)]',
          disabled && 'opacity-50 cursor-not-allowed',
        ]"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
  </div>
</template>
