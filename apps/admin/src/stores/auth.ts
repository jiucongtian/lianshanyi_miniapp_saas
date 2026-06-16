import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginPayload } from '@/api/auth'

interface AuthUser {
  id: string
  username?: string
  phone?: string
  isAdmin: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  function restoreUser() {
    const raw = localStorage.getItem('admin_user')
    if (raw) {
      try { user.value = JSON.parse(raw) as AuthUser } catch { /* ignore */ }
    }
  }

  async function login(payload: LoginPayload) {
    const result = await authApi.login(payload)
    token.value = result.accessToken
    user.value = result.user
    localStorage.setItem('admin_token', result.accessToken)
    localStorage.setItem('admin_user', JSON.stringify(result.user))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  return { token, user, isLoggedIn, login, logout, restoreUser }
})
