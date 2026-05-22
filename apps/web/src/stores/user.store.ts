import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserType } from '@/types'
import { getAllUserTypes } from '@/api/user.api'

export const useUserStore = defineStore('user', () => {
  const userTypes = ref<UserType[]>([])
  const loading = ref(false)

  async function fetchUserTypes() {
    loading.value = true
    try {
      const res = await getAllUserTypes()
      if (res.data?.data) {
        userTypes.value = res.data.data
      }
    } finally {
      loading.value = false
    }
  }

  return {
    userTypes,
    loading,
    fetchUserTypes,
  }
})
