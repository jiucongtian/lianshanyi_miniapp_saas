<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getCard } from '@/api/card.api'
import type { StaticCard } from '@/types'

const route = useRoute()
const router = useRouter()

const card = ref<StaticCard | null>(null)
const loading = ref(false)

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

onMounted(async () => {
  const cardId = route.params.cardId as string
  loading.value = true
  try {
    const res = await getCard(cardId)
    if (res.data?.data) {
      card.value = res.data.data
    }
  } catch {
    showToast({ type: 'fail', message: '加载失败' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="card-viewer page-container--no-tabbar">
    <van-nav-bar
      :title="card?.name ?? '卡牌详情'"
      left-arrow
      @click-left="router.back()"
    />

    <van-skeleton v-if="loading" :row="5" style="padding: 20px" />

    <template v-else-if="card">
      <!-- Card image -->
      <div class="card-viewer__img-wrap">
        <img
          :src="`/cards/${String(card.sequence).padStart(2, '0')}.png`"
          :alt="card.name"
          class="card-viewer__img"
        />
      </div>

      <!-- Hero metadata -->
      <div
        class="card-viewer__hero"
        :style="{
          backgroundColor: wuXingBgMap[card.stemWuXing],
          borderColor: wuXingColorMap[card.stemWuXing],
        }"
      >
        <div
          class="card-viewer__card-name"
          :style="{ color: wuXingColorMap[card.stemWuXing] }"
        >
          {{ card.name }}
        </div>
        <div class="card-viewer__sequence">第 {{ card.sequence }} 卦</div>
        <div class="card-viewer__elements">
          <span
            class="card-viewer__element"
            :style="{ backgroundColor: wuXingColorMap[card.stemWuXing], color: '#fff' }"
          >
            {{ card.stem }} · {{ card.stemWuXing }}
          </span>
          <span
            class="card-viewer__element"
            :style="{ backgroundColor: wuXingColorMap[card.branchWuXing], color: '#fff' }"
          >
            {{ card.branch }} · {{ card.branchWuXing }}
          </span>
        </div>
      </div>

      <!-- Details -->
      <van-cell-group inset style="margin-top: 16px">
        <van-cell title="天干" :value="card.stem" />
        <van-cell title="地支" :value="card.branch" />
        <van-cell title="天干五行" :value="card.stemWuXing" />
        <van-cell title="地支五行" :value="card.branchWuXing" />
        <van-cell title="纳音" :value="card.nayin" />
      </van-cell-group>

      <div class="card-viewer__desc-section">
        <div class="card-viewer__desc-title">卦象解读</div>
        <div class="card-viewer__desc-text">{{ card.description }}</div>
      </div>
    </template>

    <van-empty v-else description="卡牌数据不存在" />
  </div>
</template>

<style scoped>
.card-viewer {
  background: var(--color-bg);
}

/* ─── Card image ─────────────────────────── */
.card-viewer__img-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0 0;
}

.card-viewer__img {
  width: 160px;
  aspect-ratio: 7 / 12;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: block;
}

.card-viewer__hero {
  margin: 16px 16px 0;
  padding: 20px 24px;
  border-radius: 20px;
  border: 2px solid;
  text-align: center;
}

.card-viewer__card-name {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: 8px;
  line-height: 1;
}

.card-viewer__sequence {
  margin-top: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.card-viewer__elements {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.card-viewer__element {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.card-viewer__desc-section {
  margin: 16px 16px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}

.card-viewer__desc-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 12px;
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}

.card-viewer__desc-text {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.8;
}
</style>
