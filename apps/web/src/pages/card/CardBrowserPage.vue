<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { listCards } from '@/api/card.api'
import type { StaticCard } from '@/types'

const router = useRouter()
const cards = ref<StaticCard[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await listCards()
    if (res.data?.data) {
      cards.value = res.data.data
    }
  } catch {
    showToast({ type: 'fail', message: '加载失败' })
  } finally {
    loading.value = false
  }
})

const wuXingColorMap: Record<string, string> = {
  木: '#4caf7d',
  火: '#e05f5f',
  土: '#c9933a',
  金: '#a0a0a0',
  水: '#4a90c4',
}

const wuXingBgMap: Record<string, string> = {
  木: 'rgba(76, 175, 125, 0.1)',
  火: 'rgba(224, 95, 95, 0.1)',
  土: 'rgba(201, 147, 58, 0.1)',
  金: 'rgba(160, 160, 160, 0.1)',
  水: 'rgba(74, 144, 196, 0.1)',
}

function getCardStyle(card: StaticCard) {
  return {
    backgroundColor: wuXingBgMap[card.stemWuXing] ?? 'rgba(255,255,255,0.06)',
    borderColor: wuXingColorMap[card.stemWuXing] ?? 'rgba(255,210,122,0.2)',
    color: wuXingColorMap[card.stemWuXing] ?? '#ffd27a',
  }
}
</script>

<template>
  <div class="card-browser page-container--no-tabbar">
    <van-nav-bar
      title="卡牌查看器"
      left-arrow
      @click-left="router.back()"
    />

    <div class="card-browser__header">
      <div class="card-browser__title">六十甲子</div>
      <div class="card-browser__sub">点击卡牌查看详情</div>
    </div>

    <!-- Loading -->
    <van-skeleton v-if="loading" :row="6" style="padding: 16px" />

    <!-- Card grid -->
    <van-grid v-else :column-num="4" :gutter="10" class="card-browser__grid">
      <van-grid-item
        v-for="card in cards"
        :key="card.id"
        @click="router.push(`/cards/${card.id}`)"
      >
        <div class="card-browser__item" :style="getCardStyle(card)">
          <div class="card-browser__item-name">{{ card.name }}</div>
          <div class="card-browser__item-seq">第{{ card.sequence }}卦</div>
        </div>
      </van-grid-item>
    </van-grid>

    <van-empty v-if="!loading && cards.length === 0" description="暂无卡牌数据" />
  </div>
</template>

<style scoped>
.card-browser {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
}

.card-browser :deep(.van-nav-bar) {
  background: transparent;
}

.card-browser :deep(.van-nav-bar__title),
.card-browser :deep(.van-nav-bar__left) {
  color: #ffd27a;
}

.card-browser__header {
  text-align: center;
  padding: 16px 20px 8px;
}

.card-browser__title {
  font-size: 20px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 3px;
}

.card-browser__sub {
  font-size: 12px;
  color: rgba(255, 210, 122, 0.5);
  margin-top: 4px;
}

.card-browser__grid {
  padding: 8px 12px 24px;
}

.card-browser__item {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.card-browser__item:active {
  transform: scale(0.92);
  opacity: 0.85;
}

.card-browser__item-name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.card-browser__item-seq {
  font-size: 9px;
  opacity: 0.6;
}
</style>
