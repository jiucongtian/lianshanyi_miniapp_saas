<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile.store'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const profileStore = useProfileStore()
const authStore = useAuthStore()

const loading = ref(false)
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

function getPillar(key: string) {
  if (!bazi.value) return null
  return bazi.value[key as keyof typeof bazi.value] as {
    stem: string; branch: string; stemWuXing: string; branchWuXing: string
  } | null
}

function stemColor(key: string): string {
  const p = getPillar(key)
  if (!p) return '#854C65'
  return wuXingColorMap[p.stemWuXing] ?? '#854C65'
}

function toggleFlip(index: number) {
  if (!bazi.value) return
  flipped.value = flipped.value.map((v, i) => (i === index ? !v : v))
}

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
    <!-- 内容卡片容器 -->
    <div class="bazi-content">
      <!-- 标题行 -->
      <div class="title-header">
        <div class="bazi-title">我的命盘</div>
        <div
          class="profile-entry-button"
          @click="router.push(authStore.isLoggedIn && !authStore.isGuest ? '/profiles/add' : '/login')"
        >
          <span class="profile-entry-icon">👤</span>
          <span class="profile-entry-text">
            {{ authStore.isLoggedIn && !authStore.isGuest ? '档案' : '登录' }}
          </span>
          <span
            v-if="profileStore.profiles.length"
            class="profile-count-badge"
          >
            <span class="badge-text">{{ profileStore.profiles.length }}</span>
          </span>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-icon">🔮</div>
        <div class="loading-text">命盘解析中…</div>
      </div>

      <!-- 未登录 -->
      <div v-else-if="!authStore.isLoggedIn || authStore.isGuest" class="empty-state">
        <div class="empty-icon">🔮</div>
        <div class="empty-text">登录后查看您的八字命盘</div>
        <div class="empty-desc">创建专属档案，解读生命密码</div>
        <div class="create-card-button" @click="router.push('/login')">
          <span class="create-card-icon">✨</span>
          <span class="create-card-text">立即登录</span>
        </div>
      </div>

      <!-- 无档案 -->
      <div v-else-if="!profile" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">尚未创建档案</div>
        <div class="empty-desc">创建档案后即可查看专属命盘</div>
        <div class="create-card-button" @click="router.push('/profiles/add')">
          <span class="create-card-icon">➕</span>
          <span class="create-card-text">创建档案</span>
        </div>
      </div>

      <!-- 无八字数据 -->
      <div v-else-if="!bazi" class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-text">命盘数据尚未生成</div>
        <div class="empty-desc">请稍后再来查看</div>
      </div>

      <!-- 八字四柱翻牌 -->
      <template v-else>
        <div class="profile-name-row">{{ profile.name }}的命盘</div>

        <!-- 2×2 翻牌格 -->
        <div class="pillars-flex">
          <div
            v-for="(def, idx) in pillarDefs"
            :key="def.key"
            class="bazi-card"
            :class="{ 'bazi-card--flipped': flipped[idx] }"
            @click="toggleFlip(idx)"
          >
            <div class="bazi-card__inner">
              <!-- 正面 -->
              <div class="bazi-card__front">
                <div class="bazi-card__tag">{{ def.tag }}</div>
                <div class="bazi-card__label">{{ def.label }}</div>
                <div class="bazi-card__sub">{{ def.sub }}</div>
                <div class="bazi-card__hint">点击翻转</div>
              </div>
              <!-- 背面 -->
              <div
                class="bazi-card__back"
                :style="{ borderColor: stemColor(def.key) }"
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

        <!-- 日主 -->
        <div class="day-master-row">
          <span class="dm-label">日主</span>
          <span class="dm-value" :style="{ color: stemColor('dayPillar') }">
            {{ bazi.dayMaster }}
          </span>
        </div>

        <!-- 五行分布 -->
        <div class="wuxing-section">
          <div class="wuxing-title">五行分布</div>
          <div class="wuxing-bars">
            <div v-for="wx in wuXingOrder" :key="wx" class="wuxing-item">
              <div class="wuxing-emoji">{{ wuXingEmoji[wx] }}</div>
              <div class="wuxing-bar-wrap">
                <div
                  class="wuxing-bar"
                  :style="{
                    width: `${Math.round(((bazi.wuXingSummary[wx] ?? 0) / wuXingTotal) * 100)}%`,
                    backgroundColor: wuXingColorMap[wx],
                  }"
                ></div>
              </div>
              <div class="wuxing-count" :style="{ color: wuXingColorMap[wx] }">
                {{ bazi.wuXingSummary[wx] ?? 0 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 抽卡按钮 -->
        <div class="draw-btn-row">
          <div class="draw-btn" @click="router.push('/answer')">抽卡寻找答案</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ─── 页面背景 ───────────────────────────── */
.card-page {
  background-color: #f6f6f6;
  min-height: 100vh;
  padding-bottom: 32px;
}

/* ─── 内容卡片 ───────────────────────────── */
.bazi-content {
  margin: 16px;
  background: #ffffff;
  border: 1px solid #c896b4;
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 1px 6px rgba(133, 76, 101, 0.15),
    0 0 10px rgba(200, 150, 180, 0.1);
  min-height: 674px;
  box-sizing: border-box;
}

/* ─── 标题行 ─────────────────────────────── */
.title-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  position: relative;
}

.bazi-title {
  font-size: 18px;
  font-weight: bold;
  color: #854C65;
  text-align: center;
  flex: 1;
  letter-spacing: 1px;
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

.profile-entry-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #854C65 0%, #a85c7a 100%);
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(133, 76, 101, 0.3);
  cursor: pointer;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.profile-entry-button:active {
  transform: scale(0.95);
}

.profile-entry-icon {
  font-size: 14px;
}

.profile-entry-text {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.profile-count-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  background: #ff4757;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1px solid #ffffff;
  box-sizing: border-box;
}

.badge-text {
  font-size: 10px;
  color: #ffffff;
  font-weight: bold;
  line-height: 1;
}

/* ─── 加载 / 空状态 ──────────────────────── */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 600px;
  text-align: center;
}

.loading-icon,
.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  animation: pulseSpin 1.5s ease-in-out infinite;
}

@keyframes pulseSpin {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.1); opacity: 0.7; }
}

.loading-text,
.empty-text {
  font-size: 16px;
  color: #854C65;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 16px;
  line-height: 1.5;
  opacity: 0.8;
}

.create-card-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #854C65 0%, #a85c7a 100%);
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(133, 76, 101, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
  margin-top: 12px;
}

.create-card-button:active {
  transform: scale(0.95);
}

.create-card-icon {
  font-size: 16px;
  color: #ffffff;
}

.create-card-text {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
}

/* ─── 档案名 ─────────────────────────────── */
.profile-name-row {
  text-align: center;
  font-size: 13px;
  color: #A06B7F;
  margin-bottom: 16px;
}

/* ─── 2×2 翻牌格 ──────────────────────────── */
.pillars-flex {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-height: 300px;
}

/* ─── 翻牌动画 ───────────────────────────── */
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
  border-radius: 12px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* 正面：白色，浅玫瑰色边框 */
.bazi-card__front {
  background: #ffffff;
  border: 1px solid rgba(200, 150, 180, 0.4);
  box-shadow: 0 1px 6px rgba(133, 76, 101, 0.1);
}

.bazi-card__tag {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 11px;
  color: rgba(133, 76, 101, 0.4);
  letter-spacing: 1px;
}

.bazi-card__label {
  font-size: 14px;
  font-weight: 700;
  color: #854C65;
  letter-spacing: 0.5px;
  text-align: center;
}

.bazi-card__sub {
  font-size: 11px;
  color: rgba(133, 76, 101, 0.55);
}

.bazi-card__hint {
  position: absolute;
  bottom: 8px;
  font-size: 10px;
  color: rgba(133, 76, 101, 0.3);
}

/* 背面：浅色底，彩色边框 */
.bazi-card__back {
  background: rgba(133, 76, 101, 0.04);
  border: 1.5px solid;
  transform: rotateY(180deg);
}

.bazi-card__back-sub {
  font-size: 10px;
  color: rgba(133, 76, 101, 0.5);
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.bazi-card__ganzhi {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 4px;
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
  color: rgba(133, 76, 101, 0.3);
}

/* ─── 日主 ───────────────────────────────── */
.day-master-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 16px 0 0;
  padding: 10px 16px;
  background: rgba(133, 76, 101, 0.04);
  border: 1px solid rgba(200, 150, 180, 0.2);
  border-radius: 10px;
}

.dm-label {
  font-size: 13px;
  color: #999;
}

.dm-value {
  font-size: 22px;
  font-weight: 700;
}

/* ─── 五行分布 ───────────────────────────── */
.wuxing-section {
  margin: 12px 0 0;
  padding: 14px;
  background: rgba(133, 76, 101, 0.03);
  border: 1px solid rgba(200, 150, 180, 0.15);
  border-radius: 10px;
}

.wuxing-title {
  font-size: 12px;
  color: #A06B7F;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.wuxing-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wuxing-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wuxing-emoji {
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.wuxing-bar-wrap {
  flex: 1;
  height: 7px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.wuxing-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
  min-width: 3px;
}

.wuxing-count {
  font-size: 13px;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

/* ─── 抽卡按钮 ───────────────────────────── */
.draw-btn-row {
  margin-top: 16px;
}

.draw-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  border-radius: 24px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(133, 76, 101, 0.3);
  transition: transform 0.2s;
}

.draw-btn:active {
  transform: scale(0.98);
}
</style>
