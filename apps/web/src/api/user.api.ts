import apiClient from './client'
import type { ApiResponse, User, UserType } from '@/types'

export function getMe() {
  return apiClient.get<ApiResponse<User>>('/users/me')
}

export function updateMe(data: Partial<Pick<User, 'nickname' | 'avatar'>>) {
  return apiClient.patch<ApiResponse<User>>('/users/me', data)
}

export function getAllUserTypes() {
  return apiClient.get<ApiResponse<UserType[]>>('/user-types')
}

export function updateUserType(userId: string, userType: string) {
  return apiClient.patch<ApiResponse<User>>(`/users/${userId}/type`, { userType })
}

export function listUsers(page = 1, limit = 20, search?: string) {
  return apiClient.get<ApiResponse<User[]>>('/users', {
    params: { page, limit, search },
  })
}
