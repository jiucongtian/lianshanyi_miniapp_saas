<script setup lang="ts">
defineProps<{
  description?: string
  image?: string
}>()
</script>

<template>
  <van-empty
    :image="image ?? 'default'"
    :description="description ?? '暂无数据'"
    class="empty-state"
  >
    <slot />
  </van-empty>
</template>

<style scoped>
.empty-state {
  padding: 48px 0;
}
</style>
