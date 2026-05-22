<template>
  <Suspense>
    <router-view />
    <template #fallback>
      <div class="app-loading">
        <van-loading size="36px" color="#8B4513" />
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
  background-color: #fff8f0;
}
</style>
