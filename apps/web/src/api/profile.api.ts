import apiClient from './client'
import type { ApiResponse, Profile, ProfileFormData } from '@/types'

export function listProfiles() {
  return apiClient.get<ApiResponse<Profile[]>>('/profiles')
}

export function getProfile(id: string) {
  return apiClient.get<ApiResponse<Profile>>(`/profiles/${id}`)
}

export function createProfile(data: ProfileFormData) {
  return apiClient.post<ApiResponse<Profile>>('/profiles', data)
}

export function updateProfile(id: string, data: Partial<ProfileFormData>) {
  return apiClient.patch<ApiResponse<Profile>>(`/profiles/${id}`, data)
}

export function deleteProfile(id: string) {
  return apiClient.delete<ApiResponse<null>>(`/profiles/${id}`)
}

export function setDefaultProfile(id: string) {
  return apiClient.post<ApiResponse<Profile>>(`/profiles/${id}/default`)
}
