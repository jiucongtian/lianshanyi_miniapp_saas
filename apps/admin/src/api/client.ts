import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  code: string | null
}

export interface PaginatedData<T> {
  items?: T[]
  meta: { total: number; page: number; limit: number }
}

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30_000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    } else {
      const msg = error.response?.data?.error ?? error.message ?? '请求失败'
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  },
)

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await client.get<ApiResponse<T>>(url, { params })
  if (!res.data.success) throw new Error(res.data.error ?? '请求失败')
  return res.data.data as T
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await client.post<ApiResponse<T>>(url, body)
  if (!res.data.success) throw new Error(res.data.error ?? '请求失败')
  return res.data.data as T
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await client.put<ApiResponse<T>>(url, body)
  if (!res.data.success) throw new Error(res.data.error ?? '请求失败')
  return res.data.data as T
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await client.patch<ApiResponse<T>>(url, body)
  if (!res.data.success) throw new Error(res.data.error ?? '请求失败')
  return res.data.data as T
}

export async function del<T>(url: string): Promise<T> {
  const res = await client.delete<ApiResponse<T>>(url)
  if (!res.data.success) throw new Error(res.data.error ?? '请求失败')
  return res.data.data as T
}
