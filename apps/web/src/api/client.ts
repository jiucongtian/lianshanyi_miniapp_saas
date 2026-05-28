import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach token + tenant slug
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Inject tenant slug unless the caller already set it (e.g. bootstrap call)
    if (!config.headers['X-Tenant-Slug']) {
      // Resolve slug from hostname at call time (avoids circular import with Pinia store)
      const host = window.location.hostname
      let slug = 'default'
      if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        const parts = host.split('.')
        if (parts.length === 2 && parts[1] === 'localhost') {
          // 'xinian.localhost' → 'xinian'  (local dev subdomain)
          slug = parts[0]
        } else if (parts.length >= 3) {
          // 'xinian.example.com' → 'xinian'
          slug = parts[0]
        }
        // single-part 'localhost' → stays 'default'
      }
      config.headers['X-Tenant-Slug'] = slug
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Track if we're already refreshing to avoid loops
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const newToken: string = response.data?.data?.accessToken ?? response.data?.accessToken
      if (newToken) {
        localStorage.setItem('accessToken', newToken)
        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }
      throw new Error('No token in refresh response')
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
