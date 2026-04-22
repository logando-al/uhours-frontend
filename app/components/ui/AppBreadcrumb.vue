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

const items = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1
    return {
      label: LABELS[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1)),
      route: isLast ? undefined : '/' + segments.slice(0, i + 1).join('/'),
    }
  })
})
</script>

<template>
  <Breadcrumb
    :model="items"
    :pt="{
      root: { class: '!bg-transparent !border-none !p-0 !rounded-none' },
      list: { class: 'flex items-center gap-1 text-sm' },
      item: { class: 'flex items-center' },
      itemLink: { class: 'text-[var(--muted)] hover:text-[var(--fg)] transition-colors' },
      itemLabel: { class: 'text-[var(--muted)] hover:text-[var(--fg)]' },
      separator: { class: 'text-[var(--muted)] mx-0.5' },
    }"
  />
</template>
