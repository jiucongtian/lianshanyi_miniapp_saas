import { watchEffect } from 'vue'
import { useTenantStore } from '@/stores/tenant.store'
import type { TenantPublicConfig } from '@/api/tenant.api'

function applyTheme(config: TenantPublicConfig): void {
  const root = document.documentElement
  const { themeConfig } = config
  root.style.setProperty('--color-primary', themeConfig.primaryColor)
  root.style.setProperty('--color-bg', themeConfig.bgColor)
  root.style.setProperty('--color-card-bg', themeConfig.cardBgColor)
  root.style.setProperty('--color-button', themeConfig.buttonColor)
  // Vant component theming
  root.style.setProperty('--van-primary-color', themeConfig.primaryColor)
  root.style.setProperty('--van-button-primary-background', themeConfig.primaryColor)
  root.style.setProperty('--van-button-primary-border-color', themeConfig.primaryColor)
}

export function useTheme(): void {
  const tenantStore = useTenantStore()

  watchEffect(() => {
    if (tenantStore.config) {
      applyTheme(tenantStore.config)
    }
  })
}
