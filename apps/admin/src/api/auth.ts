import { post, put } from './client'

export interface LoginPayload {
  usernameOrPhone: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: { id: string; username?: string; phone?: string; isAdmin: boolean }
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export const authApi = {
  login: (payload: LoginPayload) => post<LoginResult>('/v1/admin/auth/login', payload),
  changePassword: (payload: ChangePasswordPayload) => put<void>('/v1/admin/auth/password', payload),
}
