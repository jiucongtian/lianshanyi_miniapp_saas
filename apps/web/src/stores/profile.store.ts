import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Profile, ProfileFormData } from '@/types'
import * as profileApi from '@/api/profile.api'

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref<Profile[]>([])
  const loading = ref(false)

  // Getters
  const defaultProfile = computed(
    () => profiles.value.find((p) => p.isDefault) ?? profiles.value[0] ?? null,
  )

  async function fetchProfiles() {
    loading.value = true
    try {
      const res = await profileApi.listProfiles()
      if (res.data?.data) {
        profiles.value = res.data.data
      }
    } finally {
      loading.value = false
    }
  }

  async function createProfile(data: ProfileFormData) {
    const res = await profileApi.createProfile(data)
    if (res.data?.data) {
      profiles.value = [...profiles.value, res.data.data]
    }
    return res.data
  }

  async function updateProfile(id: string, data: Partial<ProfileFormData>) {
    const res = await profileApi.updateProfile(id, data)
    if (res.data?.data) {
      profiles.value = profiles.value.map((p) => (p.id === id ? res.data!.data! : p))
    }
    return res.data
  }

  async function deleteProfile(id: string) {
    const res = await profileApi.deleteProfile(id)
    if (res.data?.success) {
      profiles.value = profiles.value.filter((p) => p.id !== id)
    }
    return res.data
  }

  async function setDefault(id: string) {
    const res = await profileApi.setDefaultProfile(id)
    if (res.data?.success) {
      profiles.value = profiles.value.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    }
    return res.data
  }

  return {
    profiles,
    loading,
    defaultProfile,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefault,
  }
})
