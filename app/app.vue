<script setup lang="ts">
const { init } = useTheme()

onMounted(() => {
  init()
})
</script>

<template>
  <div>
    <VitePwaManifest />
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
