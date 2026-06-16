import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/pages/DashboardPage.vue'),
          meta: { title: '数据看板', icon: 'DataAnalysis' },
        },
        {
          path: 'credentials',
          name: 'credentials',
          component: () => import('@/pages/CredentialsPage.vue'),
          meta: { title: '凭据管理', icon: 'Key' },
        },
        {
          path: 'ai-config',
          name: 'ai-config',
          component: () => import('@/pages/AiConfigPage.vue'),
          meta: { title: 'AI 配置', icon: 'Setting' },
        },
        {
          path: 'accounts',
          name: 'accounts',
          component: () => import('@/pages/AccountsPage.vue'),
          meta: { title: '租户管理', icon: 'OfficeBuilding' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/pages/UsersPage.vue'),
          meta: { title: '用户管理', icon: 'User' },
        },
        {
          path: 'feedbacks',
          name: 'feedbacks',
          component: () => import('@/pages/FeedbacksPage.vue'),
          meta: { title: '反馈管理', icon: 'ChatDotRound' },
        },
        {
          path: 'account-settings',
          name: 'account-settings',
          component: () => import('@/pages/AccountSettingsPage.vue'),
          meta: { title: '账户设置', icon: 'UserFilled' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  auth.restoreUser()
  if (!to.meta.public && !auth.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && auth.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
