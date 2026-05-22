import apiClient from './client'
import type { ApiResponse, User } from '@/types'

export interface LoginResponse {
  accessToken: string
  user: User
}

export function sendSmsCode(phone: string) {
  return apiClient.post<ApiResponse<null>>('/auth/sms/send', { phone })
}

export function loginSms(phone: string, code: string) {
  return apiClient.post<ApiResponse<LoginResponse>>('/auth/sms/login', { phone, code })
}

export function loginPassword(username: string, password: string) {
  return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { username, password })
}

export function loginGuest() {
  return apiClient.post<ApiResponse<LoginResponse>>('/auth/guest')
}

export function refreshToken() {
  return apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
}

export function logout() {
  return apiClient.post<ApiResponse<null>>('/auth/logout')
}

export function register(username: string, password: string, phone?: string) {
  return apiClient.post<ApiResponse<LoginResponse>>('/auth/register', {
    username,
    password,
    phone,
  })
}
