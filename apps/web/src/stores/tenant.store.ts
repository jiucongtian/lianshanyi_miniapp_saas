import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTenantPublicConfig, type TenantPublicConfig } from '@/api/tenant.api'

function resolveSlugFromHostname(): string {
  const host = window.location.hostname
  // IP address → default
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return 'default'

  const parts = host.split('.')

  // 'localhost' → default
  if (parts.length === 1) return parts[0] === 'localhost' ? 'default' : parts[0]

  // 'xinian.localhost' → 'xinian'  (local dev subdomain of .localhost)
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0]

  // 'abc.example.com' or deeper → first segment is the tenant slug
  if (parts.length >= 3) return parts[0]

  return 'default'
}

export const useTenantStore = defineStore('tenant', () => {
  const slug = ref<string>('default')
  const config = ref<TenantPublicConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function init(): Promise<void> {
    slug.value = resolveSlugFromHostname()
    await fetchConfig()
  }

  async function fetchConfig(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const res = await getTenantPublicConfig(slug.value)
      config.value = res.data.data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载租户配置失败'
      error.value = message
      // Keep config null so the app falls back to defaults
    } finally {
      isLoading.value = false
    }
  }

  return {
    slug,
    config,
    isLoading,
    error,
    init,
    fetchConfig,
  }
})
