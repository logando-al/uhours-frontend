<template>
  <div class="min-h-dvh flex bg-[var(--bg)]">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <header class="hidden md:flex items-center h-14 px-8 border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-0 z-10 shrink-0">
        <AppBreadcrumb />
      </header>

      <main class="flex-1">
        <slot />
      </main>
    </div>

    <AppToast />
  </div>
</template>
