<script setup lang="ts">
defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [token: string]
}>()
</script>

<template>
  <div class="flex justify-center">
    <NuxtTurnstile :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />
  </div>
</template>
