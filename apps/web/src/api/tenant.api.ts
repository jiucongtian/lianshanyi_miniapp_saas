import { apiClient } from './client'

export interface TenantPublicConfig {
  slug: string
  name: string
  plan: string
  themeConfig: {
    brandName: string
    logoUrl?: string
    primaryColor: string
    bgColor: string
    cardBgColor: string
    buttonColor: string
    copy: {
      homeTitle: string
      homeSubtitle: string
      drawButtonText: string
      inputPlaceholder: string
      tabInsight: string
      tabDaily: string
    }
    features: {
      showDailyInsight: boolean
      showAssistant: boolean
      requireLogin: boolean
    }
  }
  limits: {
    dailyDrawCount: number
    maxUsers: number
  }
}

/**
 * Fetch public tenant config — does NOT require auth or X-Tenant-Slug header.
 * Uses a direct axios call to bypass the tenant interceptor.
 */
export function getTenantPublicConfig(slug: string) {
  return apiClient.get<{ success: boolean; data: TenantPublicConfig }>(
    `/tenants/public/${slug}/config`,
    {
      // Deliberately skip X-Tenant-Slug for this call since it's a bootstrap request
      headers: { 'X-Tenant-Slug': slug },
    },
  )
}
