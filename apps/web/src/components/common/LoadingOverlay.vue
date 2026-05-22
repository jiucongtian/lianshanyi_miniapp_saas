<script setup lang="ts">
defineProps<{
  visible: boolean
  text?: string
}>()
</script>

<template>
  <div v-if="visible" class="loading-overlay">
    <van-loading size="42px" color="#8B4513" vertical>
      {{ text ?? '加载中...' }}
    </van-loading>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 248, 240, 0.85);
  z-index: 9999;
  backdrop-filter: blur(2px);
}
</style>
