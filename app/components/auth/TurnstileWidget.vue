<script setup lang="ts">
const emit = defineEmits<{
  verified: [token: string]
  error: []
}>()
</script>

<template>
  <div class="flex justify-center">
    <NuxtTurnstile
      @verified="emit('verified', $event)"
      @error="emit('error')"
    />
  </div>
</template>
