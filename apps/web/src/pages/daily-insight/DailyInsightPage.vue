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
    <!-- 导航栏 -->
    <van-nav-bar
      title="每日愈见"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="daily-insight__loading">
      <van-loading type="spinner" color="#c896b4" size="32" />
    </div>

    <!-- 内容 -->
    <template v-else-if="insight">
      <!-- 卡片容器（玻璃风格） -->
      <div class="card-container">
        <!-- 日期与干支 -->
        <div class="date-card-row">
          <div class="date-header">
            <span class="date-text date-year">{{ insight.date }}</span>
            <span class="date-text date-month">{{ insight.dayStem }}</span>
            <span class="date-text date-day">{{ insight.dayBranch }}日</span>
          </div>
          <!-- 卡牌图片 -->
          <div class="card-image-wrapper">
            <img
              :src="`/cards/${String(insight.cardId).padStart(2, '0')}.png`"
              :alt="insight.cardName"
              class="card-image"
            />
          </div>
        </div>

        <!-- 时间轴 -->
        <div class="timeline">
          <!-- 今日能量 -->
          <div class="timeline-item">
            <div class="section">
              <div class="section-title">🌟 今日卡牌传递的能量</div>
              <div class="section-content">{{ insight.summary }}</div>
            </div>
          </div>

          <!-- 卡牌祝福 -->
          <div class="timeline-item">
            <div class="section">
              <div class="section-title">🌸 卡牌给我的祝福</div>
              <div class="section-content">{{ insight.fullText }}</div>
            </div>
          </div>

          <!-- 通关密码 -->
          <div
            v-if="insight.luckyDirection || insight.luckyColor || insight.luckyNumber !== undefined"
            class="timeline-item"
          >
            <div class="password-banner">
              <div class="password-label">🔑 通关密码</div>
              <div class="password-items">
                <div v-if="insight.luckyDirection" class="password-item">
                  <span class="pw-key">吉方</span>
                  <span class="pw-val">{{ insight.luckyDirection }}</span>
                </div>
                <div v-if="insight.luckyColor" class="password-item">
                  <span class="pw-key">吉色</span>
                  <span class="pw-val">{{ insight.luckyColor }}</span>
                </div>
                <div v-if="insight.luckyNumber !== undefined" class="password-item">
                  <span class="pw-key">吉数</span>
                  <span class="pw-val">{{ insight.luckyNumber }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bottom-spacing"></div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="daily-insight__empty">
      <div class="daily-insight__empty-icon">🌙</div>
      <div class="daily-insight__empty-text">今日运势暂未生成</div>
      <div class="daily-insight__empty-hint">请稍后再来</div>
    </div>
  </div>
</template>

<style scoped>
/* ─── 页面容器 ───────────────────────────── */
.daily-insight {
  background: linear-gradient(180deg, #3a2540 0%, #4a2f4f 50%, #5a3a5f 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 导航栏透明 */
.daily-insight :deep(.van-nav-bar) {
  background: transparent;
}
.daily-insight :deep(.van-nav-bar__title),
.daily-insight :deep(.van-nav-bar__left) {
  color: rgba(200, 150, 180, 0.9);
}
.daily-insight :deep(.van-icon) {
  color: rgba(200, 150, 180, 0.9);
}

/* ─── 加载 ───────────────────────────────── */
.daily-insight__loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

/* ─── 卡片容器（玻璃风格）────────────────── */
.card-container {
  width: calc(100% - 32px);
  background: rgba(45, 26, 46, 0.4);
  backdrop-filter: blur(2px);
  border: 2px solid rgba(200, 150, 180, 0.6);
  border-radius: 12px;
  margin: 12px auto;
  padding: 16px;
  box-shadow:
    0 0 15px rgba(200, 150, 180, 0.2),
    inset 0 0 20px rgba(133, 76, 101, 0.05);
  position: relative;
  flex: 1;
}

/* 装饰角 */
.card-container::before,
.card-container::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(200, 150, 180, 0.6);
}

.card-container::before {
  top: -1px; left: -1px;
  border-right: none; border-bottom: none;
  border-top-left-radius: 12px;
}

.card-container::after {
  top: -1px; right: -1px;
  border-left: none; border-bottom: none;
  border-top-right-radius: 12px;
}

/* ─── 日期与卡牌行 ───────────────────────── */
.date-card-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 20px;
  height: 180px;
}

.date-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 47px;
  min-width: 50px;
  height: 100%;
}

.date-text {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 2px;
  line-height: 1.8;
  white-space: nowrap;
  text-shadow: 0 0 3px rgba(200, 150, 180, 0.3);
}

.date-year  { font-size: 13px; }
.date-month { font-size: 18px; }
.date-day   { font-size: 18px; }

.card-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.card-image {
  height: 100%;
  width: auto;
  aspect-ratio: 7 / 12;
  object-fit: cover;
  border-radius: 8px;
  border: 1.5px solid rgba(200, 150, 180, 0.5);
  box-shadow: 0 0 12px rgba(200, 150, 180, 0.3);
  display: block;
}

/* ─── 时间轴 ─────────────────────────────── */
.timeline {
  position: relative;
  padding-left: 15px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, rgba(200, 150, 180, 0.6) 0%, rgba(200, 150, 180, 0.3) 100%);
}

.timeline-item {
  position: relative;
  margin-bottom: 12px;
  padding-left: 10px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(200, 150, 180, 0.7);
  border: 1.5px solid rgba(45, 26, 46, 0.4);
  box-shadow:
    0 0 0 1px rgba(200, 150, 180, 0.5),
    0 0 4px rgba(200, 150, 180, 0.3);
  z-index: 1;
}

/* ─── Section 卡片 ───────────────────────── */
.section {
  padding: 12px;
  background: rgba(45, 26, 46, 0.3);
  backdrop-filter: blur(1px);
  border-radius: 8px;
  border: 1px solid rgba(200, 150, 180, 0.4);
  box-shadow:
    0 0 8px rgba(200, 150, 180, 0.15),
    inset 0 0 10px rgba(133, 76, 101, 0.03);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(200, 150, 180, 0.9);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  text-shadow: 0 0 3px rgba(200, 150, 180, 0.3);
}

.section-content {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
  letter-spacing: 0.3px;
}

/* ─── 通关密码横幅 ───────────────────────── */
.password-banner {
  background: rgba(45, 26, 46, 0.4);
  backdrop-filter: blur(1px);
  padding: 14px 16px;
  text-align: center;
  border-radius: 8px;
  border: 1.5px solid rgba(200, 150, 180, 0.6);
  position: relative;
  box-shadow:
    0 0 10px rgba(200, 150, 180, 0.25),
    inset 0 0 15px rgba(133, 76, 101, 0.05);
}

.password-banner::before,
.password-banner::after {
  content: '';
  position: absolute;
  width: 8px; height: 8px;
  border: 1px solid rgba(200, 150, 180, 0.6);
}
.password-banner::before {
  top: -1px; left: -1px;
  border-right: none; border-bottom: none;
}
.password-banner::after {
  top: -1px; right: -1px;
  border-left: none; border-bottom: none;
}

.password-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(200, 150, 180, 0.9);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
  text-shadow: 0 0 3px rgba(200, 150, 180, 0.3);
}

.password-items {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.password-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pw-key {
  font-size: 12px;
  color: rgba(200, 150, 180, 0.6);
  letter-spacing: 1px;
}

.pw-val {
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 2px;
  text-shadow:
    0 0 4px rgba(200, 150, 180, 0.5),
    0 0 8px rgba(200, 150, 180, 0.25);
}

/* ─── 底部间距 ───────────────────────────── */
.bottom-spacing {
  height: 20px;
}

/* ─── 空状态 ─────────────────────────────── */
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
  color: rgba(200, 150, 180, 0.8);
  margin-bottom: 6px;
}

.daily-insight__empty-hint {
  font-size: 13px;
  color: rgba(200, 150, 180, 0.4);
}
</style>
