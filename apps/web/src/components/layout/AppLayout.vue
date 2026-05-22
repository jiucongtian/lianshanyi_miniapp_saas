<script setup lang="ts">
import TabBar from './TabBar.vue'
</script>

<template>
  <div class="app-layout">
    <main class="app-layout__content">
      <router-view />
    </main>
    <TabBar />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.app-layout__content {
  flex: 1;
  padding-bottom: 50px; /* tabbar height */
}
</style>
