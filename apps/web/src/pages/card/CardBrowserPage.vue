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

function cardImageUrl(sequence: number): string {
  return `/cards/${String(sequence).padStart(2, '0')}.png`
}

function borderColor(card: StaticCard): string {
  return wuXingColorMap[card.stemWuXing] ?? 'rgba(255,210,122,0.3)'
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
    <van-grid v-else :column-num="4" :gutter="8" class="card-browser__grid">
      <van-grid-item
        v-for="card in cards"
        :key="card.id"
        @click="router.push(`/cards/${card.id}`)"
      >
        <div class="card-browser__item" :style="{ borderColor: borderColor(card) }">
          <img
            :src="cardImageUrl(card.sequence)"
            :alt="card.name"
            class="card-browser__item-img"
          />
          <div class="card-browser__item-name" :style="{ color: borderColor(card) }">
            {{ card.name }}
          </div>
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
  width: 100%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
  background: rgba(0, 0, 0, 0.3);
}

.card-browser__item:active {
  transform: scale(0.92);
  opacity: 0.85;
}

.card-browser__item-img {
  width: 100%;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  display: block;
}

.card-browser__item-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 0 5px;
  letter-spacing: 1px;
}
</style>
