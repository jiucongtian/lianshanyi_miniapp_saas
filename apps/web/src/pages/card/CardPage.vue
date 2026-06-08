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
const showImagePreview = ref(false)
const previewImageUrl = ref('')

const pillarDefs = [
  { key: 'yearPillar',  label: '时空关系卡', sub: '年柱', tag: '年' },
  { key: 'monthPillar', label: '事业关系卡', sub: '月柱', tag: '月' },
  { key: 'dayPillar',   label: '家庭关系卡', sub: '日柱', tag: '日' },
  { key: 'hourPillar',  label: '自我关系卡', sub: '时柱', tag: '时' },
] as const

const profile = computed(() => profileStore.defaultProfile)
const bazi = computed(() => profile.value?.baziResult)
const profileCount = computed(() => profileStore.profiles.length)

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

const STEMS  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

function ganzhiToSeq(stem: string, branch: string): number {
  for (let i = 0; i < 60; i++) {
    if (STEMS[i % 10] === stem && BRANCHES[i % 12] === branch) return i + 1
  }
  return 1
}

function pillarCardUrl(key: string): string {
  const p = getPillar(key)
  if (!p) return '/cards/back.jpg'
  const seq = ganzhiToSeq(p.stem, p.branch)
  return `/cards/${String(seq).padStart(2, '0')}.png`
}

function toggleFlip(index: number) {
  if (!bazi.value) return
  if (flipped.value[index]) {
    previewImageUrl.value = pillarCardUrl(pillarDefs[index]!.key)
    showImagePreview.value = true
  } else {
    flipped.value = flipped.value.map((v, i) => (i === index ? true : v))
  }
}

function closePreview() {
  showImagePreview.value = false
}

function autoFlipSequence() {
  pillarDefs.forEach((_, i) => {
    setTimeout(() => {
      if (!flipped.value[i]) {
        flipped.value = flipped.value.map((v, j) => (j === i ? true : v))
      }
    }, 600 + i * 500)
  })
}

onMounted(async () => {
  loading.value = true
  try {
    if (authStore.isLoggedIn && !authStore.isGuest) {
      await profileStore.fetchProfiles()
      if (profileStore.defaultProfile?.baziResult) {
        autoFlipSequence()
      }
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
        <div class="bazi-title">{{ profile?.name ?? '我的命盘' }}</div>
        <div
          class="profile-entry-button"
          @click="router.push(authStore.isLoggedIn && !authStore.isGuest ? '/profiles' : '/login')"
        >
          <span class="profile-entry-icon">📋</span>
          <span class="profile-entry-text">牌库</span>
          <span v-if="profileCount > 0" class="profile-count-badge">
            <span class="badge-text">{{ profileCount }}</span>
          </span>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-icon">⏳</div>
        <div class="loading-text">正在加载卡牌数据...</div>
      </div>

      <!-- 无数据状态 -->
      <div v-else-if="!authStore.isLoggedIn || authStore.isGuest || !profile || !bazi" class="empty-state">
        <div class="empty-icon">🃏</div>
        <div class="empty-text">暂无卡牌数据</div>
        <div v-if="!authStore.isLoggedIn || authStore.isGuest" class="empty-desc">登录后即可查看</div>
        <div v-else-if="profileCount > 0" class="empty-desc">请先选择一个档案</div>
        <div v-else class="empty-desc">牌库中还没有卡牌，快来创建第一个吧</div>
        <div v-if="profileCount === 0 && authStore.isLoggedIn && !authStore.isGuest" class="create-card-button" @click="router.push('/profiles/add')">
          <span class="create-card-icon">➕</span>
          <span class="create-card-text">新建卡牌</span>
        </div>
      </div>

      <!-- 卡牌内容 -->
      <div v-else class="pillars-flex">
        <div
          v-for="(def, idx) in pillarDefs"
          :key="def.key"
          class="pillar-item"
          @click="toggleFlip(idx)"
        >
          <div
            class="bazi-card"
            :class="{ 'bazi-card--flipped': flipped[idx] }"
          >
            <div class="bazi-card__inner">
              <!-- 正面：卡背图 -->
              <div class="bazi-card__front">
                <img src="/cards/back.jpg" class="bazi-card__img" alt="卡背" />
              </div>
              <!-- 背面：对应卡牌图 -->
              <div
                class="bazi-card__back"
                :style="{ borderColor: stemColor(def.key) }"
              >
                <img :src="pillarCardUrl(def.key)" class="bazi-card__img" :alt="getPillar(def.key)?.stem + getPillar(def.key)?.branch" />
              </div>
            </div>
          </div>
          <div class="pillar-label">
            <span class="pillar-label-sub">{{ def.sub }}</span>
            <span class="pillar-label-name">{{ def.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览悬浮窗 -->
    <div v-if="showImagePreview" class="image-preview-overlay" @click="closePreview">
      <img :src="previewImageUrl" class="preview-image" alt="卡牌预览" @click.stop />
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
  margin-left: auto;
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
  font-size: 60px;
  margin-bottom: 12px;
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
  margin-bottom: 24px;
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

/* ─── 2×2 翻牌格 ──────────────────────────── */
.pillars-flex {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pillar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

/* ─── 翻牌动画 ───────────────────────────── */
.bazi-card {
  aspect-ratio: 7 / 12;
  width: 100%;
  perspective: 800px;
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
  border-radius: 10px;
  backface-visibility: hidden;
  overflow: hidden;
}

.bazi-card__front {
  border: 1px solid rgba(200, 150, 180, 0.4);
}

.bazi-card__back {
  border: 1.5px solid;
  transform: rotateY(180deg);
}

.bazi-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ─── 柱标签 ─────────────────────────────── */
.pillar-label {
  margin-top: 6px;
  text-align: center;
  line-height: 1.4;
}

.pillar-label-sub {
  display: block;
  font-size: 11px;
  color: #999;
}

.pillar-label-name {
  display: block;
  font-size: 12px;
  color: #854C65;
  font-weight: 500;
}

/* ─── 图片预览 ───────────────────────────── */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-image {
  max-width: 80vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 12px;
}
</style>
