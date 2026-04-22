<script setup lang="ts">
const route = useRoute()

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  log: 'Log',
  add: 'Add Entry',
  batch: 'Batch Import',
  subjects: 'Subjects',
  settings: 'Settings',
  'change-password': 'Change Password',
}

const crumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments.map((seg, i) => ({
    label: LABELS[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1)),
    to: '/' + segments.slice(0, i + 1).join('/'),
    last: i === segments.length - 1,
  }))
})
</script>

<template>
  <nav class="flex items-center gap-1 text-sm">
    <template v-for="(crumb, i) in crumbs" :key="crumb.to">
      <span v-if="i > 0" class="text-[var(--muted)] mx-0.5">/</span>
      <NuxtLink
        v-if="!crumb.last"
        :to="crumb.to"
        class="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
      >{{ crumb.label }}</NuxtLink>
      <span v-else class="font-semibold text-[var(--fg)]">{{ crumb.label }}</span>
    </template>
  </nav>
</template>
