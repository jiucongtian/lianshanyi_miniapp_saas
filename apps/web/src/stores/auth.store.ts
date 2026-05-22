import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import * as authApi from '@/api/auth.api'
import * as userApi from '@/api/user.api'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  // Getters
  const isLoggedIn = computed(() => !!accessToken.value)
  const isGuest = computed(() => user.value?.isGuest ?? false)
  const isAdmin = computed(() => user.value?.isAdmin === true)
  const userId = computed(() => user.value?.id ?? null)

  function _setToken(token: string) {
    accessToken.value = token
    localStorage.setItem('accessToken', token)
  }

  function _clearAuth() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('accessToken')
  }

  async function loginSms(phone: string, code: string) {
    isLoading.value = true
    try {
      const res = await authApi.loginSms(phone, code)
      const data = res.data?.data
      if (data?.accessToken) {
        _setToken(data.accessToken)
        user.value = data.user
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function loginPassword(username: string, password: string) {
    isLoading.value = true
    try {
      const res = await authApi.loginPassword(username, password)
      const data = res.data?.data
      if (data?.accessToken) {
        _setToken(data.accessToken)
        user.value = data.user
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function loginGuest() {
    isLoading.value = true
    try {
      const res = await authApi.loginGuest()
      const data = res.data?.data
      if (data?.accessToken) {
        _setToken(data.accessToken)
        user.value = data.user
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore errors on logout
    } finally {
      _clearAuth()
    }
  }

  async function refreshToken() {
    try {
      const res = await authApi.refreshToken()
      const newToken = res.data?.data?.accessToken
      if (newToken) {
        _setToken(newToken)
      }
      return newToken
    } catch {
      _clearAuth()
      return null
    }
  }

  async function fetchMe() {
    if (!accessToken.value) return null
    try {
      const res = await userApi.getMe()
      if (res.data?.data) {
        user.value = res.data.data
      }
      return user.value
    } catch {
      return null
    }
  }

  return {
    accessToken,
    user,
    isLoading,
    isLoggedIn,
    isGuest,
    isAdmin,
    userId,
    loginSms,
    loginPassword,
    loginGuest,
    logout,
    refreshToken,
    fetchMe,
  }
})
