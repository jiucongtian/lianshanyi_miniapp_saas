<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabMap: Record<string, number> = {
  '/home': 0,
  '/cards': 1,
  '/me': 2,
}

const active = ref(tabMap[route.path] ?? 0)

watch(
  () => route.path,
  (path) => {
    if (tabMap[path] !== undefined) {
      active.value = tabMap[path]
    }
  },
)

function onTabChange(index: number) {
  const paths = ['/home', '/cards', '/me']
  router.push(paths[index])
}
</script>

<template>
  <van-tabbar
    v-model="active"
    fixed
    safe-area-inset-bottom
    :border="true"
    active-color="#854C65"
    inactive-color="#999999"
    :z-index="100"
    @change="onTabChange"
  >
    <van-tabbar-item icon="gem-o" name="0">首页</van-tabbar-item>
    <van-tabbar-item icon="apps-o" name="1">卡牌</van-tabbar-item>
    <van-tabbar-item icon="contact-o" name="2">我的</van-tabbar-item>
  </van-tabbar>
</template>
