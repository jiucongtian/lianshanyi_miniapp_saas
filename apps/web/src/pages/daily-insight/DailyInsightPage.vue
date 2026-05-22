<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getTodayInsight } from '@/api/daily-insight.api'
import type { DailyInsight } from '@/types'

const router = useRouter()
const insight = ref<DailyInsight | null>(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getTodayInsight()
    if (res.data?.data) {
      insight.value = res.data.data
    }
  } catch {
    showToast({ type: 'fail', message: '加载失败' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="daily-insight page-container--no-tabbar">
    <van-nav-bar
      title="今日运势"
      left-arrow
      @click-left="router.back()"
    />

    <van-skeleton v-if="loading" :row="8" style="padding: 20px" />

    <template v-else-if="insight">
      <!-- Header -->
      <div class="daily-insight__header">
        <div class="daily-insight__date">{{ insight.date }}</div>
        <div class="daily-insight__day-info">
          {{ insight.dayStem }}{{ insight.dayBranch }}日 · {{ insight.cardName }}
        </div>
      </div>

      <!-- Title & Summary -->
      <div class="daily-insight__card">
        <div class="daily-insight__title">{{ insight.title }}</div>
        <div class="daily-insight__summary">{{ insight.summary }}</div>
      </div>

      <!-- Full text -->
      <div class="daily-insight__text-section">
        <div class="daily-insight__section-title">详细解读</div>
        <div class="daily-insight__full-text">{{ insight.fullText }}</div>
      </div>

      <!-- Lucky info -->
      <van-cell-group inset title="今日吉祥">
        <van-cell
          v-if="insight.luckyDirection"
          title="吉方"
          :value="insight.luckyDirection"
          icon="location-o"
        />
        <van-cell
          v-if="insight.luckyColor"
          title="吉色"
          :value="insight.luckyColor"
          icon="award-o"
        />
        <van-cell
          v-if="insight.luckyNumber !== undefined"
          title="吉数"
          :value="String(insight.luckyNumber)"
          icon="star-o"
        />
      </van-cell-group>
    </template>

    <van-empty v-else description="今日运势暂未生成" />
  </div>
</template>

<style scoped>
.daily-insight {
  background: var(--color-bg);
}

.daily-insight__header {
  background: linear-gradient(135deg, #8b4513 0%, #d4873b 100%);
  padding: 24px 20px;
  color: #fff;
  text-align: center;
}

.daily-insight__date {
  font-size: 14px;
  opacity: 0.9;
}

.daily-insight__day-info {
  font-size: 22px;
  font-weight: 700;
  margin-top: 4px;
  letter-spacing: 2px;
}

.daily-insight__card {
  margin: 16px;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(139, 69, 19, 0.08);
}

.daily-insight__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 10px;
}

.daily-insight__summary {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.7;
}

.daily-insight__text-section {
  margin: 0 16px 16px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}

.daily-insight__section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 12px;
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}

.daily-insight__full-text {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.85;
  white-space: pre-wrap;
}
</style>
