import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAppUpdate } from '@/lib/useAppUpdate'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/wizard',
      component: () => import('@/views/WizardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/editor/:projectId',
      component: () => import('@/views/EditorView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    // Не редиректим если это OAuth callback (есть токен или link_required в URL)
    if (!to.query.token && !to.query.link_required) {
      return '/'
    }
  }
})

// Vue Router catches dynamic import errors internally, so unhandledrejection
// and app.config.errorHandler don't fire — router.onError is the right place.
router.onError((err) => {
  const msg = String(err?.message ?? err ?? '')
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Unable to preload CSS') ||
    msg.includes('ChunkLoadError')
  ) {
    useAppUpdate().markUpdateAvailable()
  }
})

export default router
