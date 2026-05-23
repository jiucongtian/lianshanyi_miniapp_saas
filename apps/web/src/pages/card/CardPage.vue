<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile.store'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const profileStore = useProfileStore()
const authStore = useAuthStore()

const loading = ref(false)

// Track which cards are flipped (by index 0-3)
const flipped = ref<boolean[]>([false, false, false, false])

const pillarDefs = [
  { key: 'yearPillar',  label: '时空关系卡', sub: '年柱', tag: '年' },
  { key: 'monthPillar', label: '事业关系卡', sub: '月柱', tag: '月' },
  { key: 'dayPillar',   label: '家庭关系卡', sub: '日柱', tag: '日' },
  { key: 'hourPillar',  label: '自我关系卡', sub: '时柱', tag: '时' },
] as const

const profile = computed(() => profileStore.defaultProfile)
const bazi = computed(() => profile.value?.baziResult)

const wuXingColorMap: Record<string, string> = {
  木: '#4caf7d',
  火: '#e05f5f',
  土: '#c9933a',
  金: '#a0a0a0',
  水: '#4a90c4',
}

const wuXingGlowMap: Record<string, string> = {
  木: 'rgba(76, 175, 125, 0.35)',
  火: 'rgba(224, 95, 95, 0.35)',
  土: 'rgba(201, 147, 58, 0.35)',
  金: 'rgba(160, 160, 160, 0.35)',
  水: 'rgba(74, 144, 196, 0.35)',
}

function getPillar(key: string) {
  if (!bazi.value) return null
  return bazi.value[key as keyof typeof bazi.value] as {
    stem: string; branch: string; stemWuXing: string; branchWuXing: string
  } | null
}

function stemColor(key: string): string {
  const p = getPillar(key)
  if (!p) return '#ffd27a'
  return wuXingColorMap[p.stemWuXing] ?? '#ffd27a'
}

function glow(key: string): string {
  const p = getPillar(key)
  if (!p) return 'none'
  return `0 0 20px ${wuXingGlowMap[p.stemWuXing] ?? 'transparent'}`
}

function toggleFlip(index: number) {
  if (!bazi.value) return
  flipped.value = flipped.value.map((v, i) => (i === index ? !v : v))
}

// WuXing summary bar
const wuXingOrder = ['木', '火', '土', '金', '水'] as const
const wuXingEmoji: Record<string, string> = {
  木: '🌿', 火: '🔥', 土: '⛰️', 金: '⚙️', 水: '💧',
}

const wuXingTotal = computed(() => {
  if (!bazi.value?.wuXingSummary) return 8
  return Object.values(bazi.value.wuXingSummary).reduce((a, b) => a + b, 0) || 8
})

onMounted(async () => {
  loading.value = true
  try {
    if (authStore.isLoggedIn && !authStore.isGuest) {
      await profileStore.fetchProfiles()
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="card-page page-container">
    <!-- Header -->
    <div class="card-page__header">
      <div class="card-page__header-title">我的命盘</div>
      <div class="card-page__header-sub">八字四柱</div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card-page__loading">
      <van-loading type="spinner" color="#ffd27a" size="32" />
    </div>

    <!-- Not logged in -->
    <div v-else-if="!authStore.isLoggedIn || authStore.isGuest" class="card-page__empty">
      <div class="card-page__empty-icon">🔮</div>
      <div class="card-page__empty-text">登录后查看您的八字命盘</div>
      <van-button round type="primary" class="card-page__empty-btn" @click="router.push('/login')">
        立即登录
      </van-button>
    </div>

    <!-- No profile -->
    <div v-else-if="!profile" class="card-page__empty">
      <div class="card-page__empty-icon">📋</div>
      <div class="card-page__empty-text">尚未创建档案，无法显示命盘</div>
      <van-button round type="primary" class="card-page__empty-btn" @click="router.push('/profiles/add')">
        创建档案
      </van-button>
    </div>

    <!-- No bazi -->
    <div v-else-if="!bazi" class="card-page__empty">
      <div class="card-page__empty-icon">⏳</div>
      <div class="card-page__empty-text">命盘数据尚未生成</div>
    </div>

    <!-- Bazi flip cards -->
    <template v-else>
      <div class="card-page__profile-name">{{ profile.name }}的命盘</div>

      <!-- 4 flip cards -->
      <div class="card-page__grid">
        <div
          v-for="(def, idx) in pillarDefs"
          :key="def.key"
          class="bazi-card"
          :class="{ 'bazi-card--flipped': flipped[idx] }"
          @click="toggleFlip(idx)"
        >
          <div class="bazi-card__inner">
            <!-- Front: card title -->
            <div class="bazi-card__front">
              <div class="bazi-card__tag">{{ def.tag }}</div>
              <div class="bazi-card__label">{{ def.label }}</div>
              <div class="bazi-card__sub">{{ def.sub }}</div>
              <div class="bazi-card__hint">点击翻转</div>
            </div>
            <!-- Back: stem + branch -->
            <div
              class="bazi-card__back"
              :style="{
                boxShadow: glow(def.key),
                borderColor: stemColor(def.key),
              }"
            >
              <div class="bazi-card__back-sub">{{ def.sub }}</div>
              <div class="bazi-card__ganzhi" :style="{ color: stemColor(def.key) }">
                {{ getPillar(def.key)?.stem ?? '' }}{{ getPillar(def.key)?.branch ?? '' }}
              </div>
              <div class="bazi-card__wuxing-row">
                <span
                  class="bazi-card__wuxing-badge"
                  :style="{ backgroundColor: stemColor(def.key) }"
                >{{ getPillar(def.key)?.stemWuXing ?? '' }}</span>
                <span class="bazi-card__wuxing-sep">·</span>
                <span
                  class="bazi-card__wuxing-badge"
                  :style="{ backgroundColor: wuXingColorMap[getPillar(def.key)?.branchWuXing ?? ''] ?? '#888' }"
                >{{ getPillar(def.key)?.branchWuXing ?? '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Day master -->
      <div class="card-page__day-master">
        <span class="card-page__dm-label">日主</span>
        <span
          class="card-page__dm-value"
          :style="{ color: stemColor('dayPillar') }"
        >{{ bazi.dayMaster }}</span>
      </div>

      <!-- WuXing summary -->
      <div class="card-page__wuxing">
        <div class="card-page__wuxing-title">五行分布</div>
        <div class="card-page__wuxing-bars">
          <div
            v-for="wx in wuXingOrder"
            :key="wx"
            class="card-page__wuxing-item"
          >
            <div class="card-page__wuxing-emoji">{{ wuXingEmoji[wx] }}</div>
            <div class="card-page__wuxing-bar-wrap">
              <div
                class="card-page__wuxing-bar"
                :style="{
                  width: `${Math.round(((bazi.wuXingSummary[wx] ?? 0) / wuXingTotal) * 100)}%`,
                  backgroundColor: wuXingColorMap[wx],
                }"
              ></div>
            </div>
            <div class="card-page__wuxing-count" :style="{ color: wuXingColorMap[wx] }">
              {{ bazi.wuXingSummary[wx] ?? 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- Go to draw -->
      <div class="card-page__draw-btn">
        <van-button round block type="primary" @click="router.push('/answer')">
          抽卡寻找答案
        </van-button>
      </div>
    </template>

    <!-- Background decor -->
    <div class="card-page__bg" aria-hidden="true">
      <div v-for="i in 6" :key="i" :class="`cp-trail cp-trail--${i}`"></div>
    </div>
  </div>
</template>

<style scoped>
.card-page {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-bottom: 100px;
}

/* ─── Header ─────────────────────────────── */
.card-page__header {
  text-align: center;
  padding: 28px 20px 8px;
  position: relative;
  z-index: 2;
}

.card-page__header-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 3px;
}

.card-page__header-sub {
  font-size: 12px;
  color: rgba(255, 210, 122, 0.5);
  margin-top: 4px;
  letter-spacing: 2px;
}

/* ─── Loading / Empty ─────────────────────── */
.card-page__loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
  position: relative;
  z-index: 2;
}

.card-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  position: relative;
  z-index: 2;
}

.card-page__empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.card-page__empty-text {
  font-size: 15px;
  color: rgba(255, 220, 170, 0.7);
  margin-bottom: 24px;
  text-align: center;
}

.card-page__empty-btn :deep(.van-button--primary) {
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  border: none;
  padding: 0 32px;
}

/* ─── Profile name ────────────────────────── */
.card-page__profile-name {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 220, 170, 0.6);
  margin: 8px 0 20px;
  position: relative;
  z-index: 2;
}

/* ─── 2×2 card grid ──────────────────────── */
.card-page__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}

/* ─── Flip card ──────────────────────────── */
.bazi-card {
  height: 160px;
  perspective: 800px;
  cursor: pointer;
}

.bazi-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.bazi-card--flipped .bazi-card__inner {
  transform: rotateY(180deg);
}

.bazi-card__front,
.bazi-card__back {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* Front */
.bazi-card__front {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 210, 122, 0.2);
}

.bazi-card__tag {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 11px;
  color: rgba(255, 210, 122, 0.5);
  letter-spacing: 1px;
}

.bazi-card__label {
  font-size: 15px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 1px;
}

.bazi-card__sub {
  font-size: 12px;
  color: rgba(255, 210, 122, 0.55);
}

.bazi-card__hint {
  position: absolute;
  bottom: 10px;
  font-size: 11px;
  color: rgba(255, 210, 122, 0.3);
}

/* Back */
.bazi-card__back {
  background: rgba(26, 10, 0, 0.85);
  border: 1.5px solid;
  transform: rotateY(180deg);
  transition: box-shadow 0.3s;
}

.bazi-card__back-sub {
  font-size: 11px;
  color: rgba(255, 210, 122, 0.5);
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.bazi-card__ganzhi {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 6px;
  line-height: 1;
}

.bazi-card__wuxing-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.bazi-card__wuxing-badge {
  font-size: 11px;
  color: #fff;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
}

.bazi-card__wuxing-sep {
  color: rgba(255, 210, 122, 0.3);
}

/* ─── Day master ─────────────────────────── */
.card-page__day-master {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 20px 20px 0;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.15);
  border-radius: 12px;
  position: relative;
  z-index: 2;
}

.card-page__dm-label {
  font-size: 13px;
  color: rgba(255, 220, 170, 0.6);
}

.card-page__dm-value {
  font-size: 22px;
  font-weight: 700;
}

/* ─── WuXing summary ─────────────────────── */
.card-page__wuxing {
  margin: 16px 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.12);
  border-radius: 16px;
  position: relative;
  z-index: 2;
}

.card-page__wuxing-title {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.6);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.card-page__wuxing-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-page__wuxing-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-page__wuxing-emoji {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.card-page__wuxing-bar-wrap {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  overflow: hidden;
}

.card-page__wuxing-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
  min-width: 4px;
}

.card-page__wuxing-count {
  font-size: 13px;
  font-weight: 700;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

/* ─── Draw button ────────────────────────── */
.card-page__draw-btn {
  padding: 8px 20px 0;
  position: relative;
  z-index: 2;
}

.card-page__draw-btn :deep(.van-button--primary) {
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  border: none;
  font-size: 16px;
  letter-spacing: 2px;
  height: 50px;
  box-shadow: 0 4px 18px rgba(184, 107, 30, 0.5);
}

/* ─── Background trails ──────────────────── */
.card-page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.cp-trail {
  position: absolute;
  width: 1px;
  border-radius: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255, 210, 122, 0.2), transparent);
  animation: trail-fall linear infinite;
  opacity: 0;
}

.cp-trail--1 { height: 50px; left: 10%; animation-duration: 8s;   animation-delay: 0s; }
.cp-trail--2 { height: 70px; left: 28%; animation-duration: 11s;  animation-delay: 2s; }
.cp-trail--3 { height: 40px; left: 55%; animation-duration: 7s;   animation-delay: 1s; }
.cp-trail--4 { height: 60px; left: 74%; animation-duration: 9.5s; animation-delay: 3s; }
.cp-trail--5 { height: 45px; left: 88%; animation-duration: 6.5s; animation-delay: 0.5s; }
.cp-trail--6 { height: 55px; left: 42%; animation-duration: 10s;  animation-delay: 4s; }

@keyframes trail-fall {
  0%   { top: -8%;  opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { top: 108%; opacity: 0; }
}
</style>
