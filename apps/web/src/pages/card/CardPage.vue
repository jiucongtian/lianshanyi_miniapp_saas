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
  木: '#2E7D32',
  火: '#C62828',
  土: '#F9A825',
  金: '#616161',
  水: '#1565C0',
}

const wuXingBgMap: Record<string, string> = {
  木: '#E8F5E9',
  火: '#FFEBEE',
  土: '#FFFDE7',
  金: '#F5F5F5',
  水: '#E3F2FD',
}

function getCardStyle(card: StaticCard) {
  return {
    backgroundColor: wuXingBgMap[card.stemWuXing] ?? '#fff8f0',
    color: wuXingColorMap[card.stemWuXing] ?? '#8B4513',
    borderColor: wuXingColorMap[card.stemWuXing] ?? '#8B4513',
  }
}
</script>

<template>
  <div class="card-page page-container">
    <div class="card-page__header">
      <div class="card-page__title">六十甲子卡牌</div>
      <div class="card-page__subtitle">点击卡牌查看详情</div>
    </div>

    <!-- Loading skeleton -->
    <van-skeleton v-if="loading" :row="6" />

    <!-- Card grid -->
    <van-grid v-else :column-num="4" :gutter="8" class="card-page__grid">
      <van-grid-item
        v-for="card in cards"
        :key="card.id"
        @click="router.push(`/cards/${card.id}`)"
      >
        <div class="card-page__card-item" :style="getCardStyle(card)">
          <div class="card-page__card-name">{{ card.name }}</div>
          <div class="card-page__card-seq">第{{ card.sequence }}卦</div>
        </div>
      </van-grid-item>
    </van-grid>

    <!-- Empty -->
    <van-empty v-if="!loading && cards.length === 0" description="暂无卡牌数据" />
  </div>
</template>

<style scoped>
.card-page {
  background: var(--color-bg);
}

.card-page__header {
  padding: 48px 20px 16px;
  background: linear-gradient(135deg, #8b4513 0%, #d4873b 100%);
  color: #fff;
}

.card-page__title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
}

.card-page__subtitle {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

.card-page__grid {
  padding: 16px;
}

.card-page__card-item {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
  gap: 2px;
  cursor: pointer;
  transition: transform 0.15s;
}

.card-page__card-item:active {
  transform: scale(0.94);
}

.card-page__card-name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.card-page__card-seq {
  font-size: 9px;
  opacity: 0.6;
}
</style>
