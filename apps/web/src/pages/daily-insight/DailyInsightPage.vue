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
    <!-- Nav bar -->
    <van-nav-bar
      title="每日愈见"
      left-arrow
      @click-left="router.back()"
    />

    <!-- Loading -->
    <div v-if="loading" class="daily-insight__loading">
      <van-loading type="spinner" color="#ffd27a" size="32" />
    </div>

    <!-- Content -->
    <template v-else-if="insight">
      <!-- Hero header -->
      <div class="daily-insight__hero">
        <div class="daily-insight__hero-bg" aria-hidden="true">
          <div v-for="i in 4" :key="i" :class="`di-trail di-trail--${i}`"></div>
        </div>
        <div class="daily-insight__hero-date">{{ insight.date }}</div>
        <div class="daily-insight__hero-ganzhi">
          {{ insight.dayStem }}{{ insight.dayBranch }}日
        </div>
        <div class="daily-insight__hero-card">
          <span class="daily-insight__hero-card-name">{{ insight.cardName }}</span>
        </div>
        <div class="daily-insight__hero-title">{{ insight.title }}</div>
      </div>

      <!-- Timeline sections -->
      <div class="daily-insight__timeline">
        <!-- Section: 今日卡牌传递的能量 -->
        <div class="di-section">
          <div class="di-section__dot">
            <div class="di-section__dot-inner"></div>
          </div>
          <div class="di-section__content">
            <div class="di-section__header">
              <span class="di-section__icon">🌟</span>
              <span class="di-section__title">今日卡牌传递的能量</span>
            </div>
            <div class="di-section__body">{{ insight.summary }}</div>
          </div>
        </div>

        <!-- Section: 卡牌给我的祝福 -->
        <div class="di-section">
          <div class="di-section__dot">
            <div class="di-section__dot-inner"></div>
          </div>
          <div class="di-section__content">
            <div class="di-section__header">
              <span class="di-section__icon">🌸</span>
              <span class="di-section__title">卡牌给我的祝福</span>
            </div>
            <div class="di-section__body">{{ insight.fullText }}</div>
          </div>
        </div>

        <!-- Section: 通关密码 (lucky info) -->
        <div v-if="insight.luckyDirection || insight.luckyColor || insight.luckyNumber !== undefined" class="di-section">
          <div class="di-section__dot">
            <div class="di-section__dot-inner"></div>
          </div>
          <div class="di-section__content">
            <div class="di-section__header">
              <span class="di-section__icon">🔑</span>
              <span class="di-section__title">通关密码</span>
            </div>
            <div class="di-lucky">
              <div v-if="insight.luckyDirection" class="di-lucky__item">
                <span class="di-lucky__label">吉方</span>
                <span class="di-lucky__value">{{ insight.luckyDirection }}</span>
              </div>
              <div v-if="insight.luckyColor" class="di-lucky__item">
                <span class="di-lucky__label">吉色</span>
                <span class="di-lucky__value">{{ insight.luckyColor }}</span>
              </div>
              <div v-if="insight.luckyNumber !== undefined" class="di-lucky__item">
                <span class="di-lucky__label">吉数</span>
                <span class="di-lucky__value">{{ insight.luckyNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else class="daily-insight__empty">
      <div class="daily-insight__empty-icon">🌙</div>
      <div class="daily-insight__empty-text">今日运势暂未生成</div>
      <div class="daily-insight__empty-hint">请稍后再来</div>
    </div>
  </div>
</template>

<style scoped>
.daily-insight {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
}

.daily-insight :deep(.van-nav-bar) {
  background: transparent;
}

.daily-insight :deep(.van-nav-bar__title),
.daily-insight :deep(.van-nav-bar__left) {
  color: #ffd27a;
}

/* ─── Loading ────────────────────────────── */
.daily-insight__loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* ─── Hero ───────────────────────────────── */
.daily-insight__hero {
  position: relative;
  text-align: center;
  padding: 24px 20px 32px;
  overflow: hidden;
}

.daily-insight__hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.di-trail {
  position: absolute;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255, 210, 122, 0.22), transparent);
  animation: trail-fall linear infinite;
  opacity: 0;
}

.di-trail--1 { height: 50px; left: 15%; animation-duration: 7s;  animation-delay: 0s; }
.di-trail--2 { height: 70px; left: 40%; animation-duration: 10s; animation-delay: 2s; }
.di-trail--3 { height: 45px; left: 65%; animation-duration: 8s;  animation-delay: 1s; }
.di-trail--4 { height: 60px; left: 85%; animation-duration: 9s;  animation-delay: 3s; }

@keyframes trail-fall {
  0%   { top: -8%;  opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { top: 108%; opacity: 0; }
}

.daily-insight__hero-date {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.5);
  letter-spacing: 1px;
  position: relative;
  z-index: 2;
}

.daily-insight__hero-ganzhi {
  font-size: 28px;
  font-weight: 800;
  color: #ffd27a;
  letter-spacing: 4px;
  margin: 8px 0;
  position: relative;
  z-index: 2;
}

.daily-insight__hero-card {
  display: inline-block;
  background: rgba(255, 210, 122, 0.12);
  border: 1px solid rgba(255, 210, 122, 0.3);
  border-radius: 20px;
  padding: 4px 16px;
  margin-bottom: 10px;
  position: relative;
  z-index: 2;
}

.daily-insight__hero-card-name {
  font-size: 14px;
  color: #ffd27a;
  letter-spacing: 2px;
}

.daily-insight__hero-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 220, 170, 0.9);
  position: relative;
  z-index: 2;
  line-height: 1.5;
}

/* ─── Timeline ───────────────────────────── */
.daily-insight__timeline {
  padding: 8px 20px 40px;
  position: relative;
}

.daily-insight__timeline::before {
  content: '';
  position: absolute;
  left: 30px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, rgba(255, 210, 122, 0.3), rgba(255, 210, 122, 0.05));
}

.di-section {
  display: flex;
  gap: 16px;
  margin-bottom: 28px;
  position: relative;
}

.di-section__dot {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  position: relative;
  z-index: 2;
}

.di-section__dot-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffd27a;
  box-shadow: 0 0 8px rgba(255, 210, 122, 0.5);
}

.di-section__content {
  flex: 1;
  min-width: 0;
}

.di-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.di-section__icon {
  font-size: 18px;
}

.di-section__title {
  font-size: 15px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 1px;
}

.di-section__body {
  font-size: 14px;
  color: rgba(255, 220, 170, 0.8);
  line-height: 1.9;
  white-space: pre-wrap;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 210, 122, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
}

/* ─── Lucky items ────────────────────────── */
.di-lucky {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 210, 122, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
}

.di-lucky__item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 80px;
}

.di-lucky__label {
  font-size: 12px;
  color: rgba(255, 210, 122, 0.5);
  flex-shrink: 0;
}

.di-lucky__value {
  font-size: 16px;
  font-weight: 700;
  color: #ffd27a;
}

/* ─── Empty ──────────────────────────────── */
.daily-insight__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
}

.daily-insight__empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.daily-insight__empty-text {
  font-size: 16px;
  color: rgba(255, 220, 170, 0.7);
  margin-bottom: 6px;
}

.daily-insight__empty-hint {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.4);
}
</style>
