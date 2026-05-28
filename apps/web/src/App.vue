<script setup lang="ts">
import { onMounted } from 'vue'
import { useTenantStore } from '@/stores/tenant.store'
import { useTheme } from '@/composables/useTheme'

const tenantStore = useTenantStore()

// Apply CSS variables reactively whenever tenant config changes
useTheme()

onMounted(async () => {
  // Bootstrap: resolve slug from hostname and fetch tenant config
  await tenantStore.init()
})
</script>

<template>
  <Suspense>
    <router-view />
    <template #fallback>
      <div class="app-loading">
        <van-loading size="36px" :color="tenantStore.config?.themeConfig.primaryColor ?? '#8B4513'" />
      </div>
    </template>
  </Suspense>
</template>

<style scoped>
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-bg, #fff8f0);
}
</style>
