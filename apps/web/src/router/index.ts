import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const PROTECTED_ROUTES = ['/answer', '/assistant', '/me']

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  // Layout routes (with TabBar)
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/pages/home/HomePage.vue'),
      },
      {
        path: 'cards',
        name: 'cards',
        component: () => import('@/pages/card/CardPage.vue'),
      },
      {
        path: 'me',
        name: 'me',
        component: () => import('@/pages/mine/MinePage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  // Full-page routes (without TabBar)
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
  },
  {
    path: '/profiles',
    name: 'profile-list',
    component: () => import('@/pages/profile/ProfileListPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profiles/add',
    name: 'profile-add',
    component: () => import('@/pages/addProfile/AddProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profiles/:id',
    name: 'profile-detail',
    component: () => import('@/pages/profile/ProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profiles/:id/edit',
    name: 'profile-edit',
    component: () => import('@/pages/addProfile/AddProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/cards/:cardId',
    name: 'card-viewer',
    component: () => import('@/pages/cardViewer/CardViewerPage.vue'),
  },
  {
    path: '/card-browser',
    name: 'card-browser',
    component: () => import('@/pages/card/CardBrowserPage.vue'),
  },
  {
    path: '/answer',
    name: 'answer',
    component: () => import('@/pages/answer/AnswerPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/daily-insight',
    name: 'daily-insight',
    component: () => import('@/pages/daily-insight/DailyInsightPage.vue'),
  },
  {
    path: '/assistant',
    name: 'assistant',
    component: () => import('@/pages/assistant/AssistantPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/feedback',
    name: 'feedback',
    component: () => import('@/pages/feedback/FeedbackPage.vue'),
  },
  {
    path: '/agreement',
    name: 'agreement',
    component: () => import('@/pages/agreement/AgreementPage.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/pages/admin/AdminPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('accessToken')
  const requiresAuth = to.meta.requiresAuth as boolean | undefined
  const isProtectedPath = PROTECTED_ROUTES.some((r) => to.path.startsWith(r))

  if ((requiresAuth || isProtectedPath) && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
