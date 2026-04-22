import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  // Rehydrate from localStorage on first client load
  if (import.meta.client && !auth.isAuthenticated) {
    auth.rehydrate()
  }

  const publicPaths = ['/', '/login', '/register', '/forgot-password']
  if (!publicPaths.includes(to.path) && !auth.isAuthenticated) {
    return navigateTo('/')
  }
})
