<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { useTenantStore } from '@/stores/tenant.store'
import { drawCard } from '@/api/card.api'
import type { DrawCardRecord } from '@/types'

const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()
const tenantStore = useTenantStore()

const selectedProfileId = ref<string>('')
const question = ref('')
const loading = ref(false)
const drawResult = ref<DrawCardRecord | null>(null)
const isFlipping = ref(false)
const showFront = ref(false)
const typedText = ref('')

const profileOptions = computed(() =>
  profileStore.profiles.map((p) => ({
    text: p.name,
    value: p.id,
  })),
)

onMounted(async () => {
  if (route.query.question && typeof route.query.question === 'string') {
    question.value = route.query.question
  }
  await profileStore.fetchProfiles()
  if (profileStore.defaultProfile) {
    selectedProfileId.value = profileStore.defaultProfile.id
  }
})

async function startDraw() {
  loading.value = true
  drawResult.value = null
  showFront.value = false
  isFlipping.value = false
  typedText.value = ''

  try {
    const res = await drawCard({
      profileId: selectedProfileId.value || undefined,
      question: question.value || undefined,
    })

    if (res.data?.success && res.data.data) {
      drawResult.value = res.data.data
      isFlipping.value = true
      setTimeout(() => {
        showFront.value = true
        startTyping(drawResult.value!.interpretation)
      }, 600)
    } else {
      showToast({ type: 'fail', message: res.data?.error ?? '抽卡失败' })
    }
  } catch {
    showToast({ type: 'fail', message: '抽卡失败，请重试' })
  } finally {
    loading.value = false
  }
}

function startTyping(text: string) {
  let index = 0
  const interval = setInterval(() => {
    if (index < text.length) {
      typedText.value += text[index]
      index++
    } else {
      clearInterval(interval)
    }
  }, 30)
}

const wuXingColorMap: Record<string, string> = {
  木: '#4caf7d',
  火: '#e05f5f',
  土: '#c9933a',
  金: '#a0a0a0',
  水: '#4a90c4',
}
</script>

<template>
  <div class="answer-page page-container--no-tabbar">
    <!-- 导航栏 -->
    <van-nav-bar
      title="抽卡解读"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 主内容玻璃卡片 -->
    <div class="main-content">
      <!-- 问题展示/输入 -->
      <div class="question-container">
        <div class="question-label">您的问题</div>
        <van-field
          v-model="question"
          type="textarea"
          placeholder="请输入您想占卜的问题，或留空"
          :autosize="{ minHeight: 52, maxHeight: 100 }"
          maxlength="100"
          show-word-limit
          class="q-field"
        />
      </div>

      <!-- 档案选择 -->
      <div class="profile-section">
        <div class="profile-label">选择档案</div>
        <van-dropdown-menu class="profile-dropdown">
          <van-dropdown-item
            v-model="selectedProfileId"
            :options="profileOptions.length ? profileOptions : [{ text: '暂无档案（游客模式）', value: '' }]"
          />
        </van-dropdown-menu>
        <div v-if="!profileOptions.length" class="no-profile-hint">
          <span>尚未创建档案，</span>
          <span class="hint-link" @click="router.push('/profiles/add')">立即创建</span>
        </div>
      </div>

      <!-- 抽卡按钮 -->
      <div class="draw-btn-wrap">
        <button
          class="btn-primary"
          :disabled="loading"
          @click="startDraw"
        >
          <van-loading v-if="loading" size="18" color="#fff" style="margin-right:8px" />
          {{ loading ? '抽卡中…' : '抽卡寻找答案' }}
        </button>
      </div>

      <!-- 翻牌 + 解读 -->
      <div v-if="isFlipping || drawResult" class="result-area">
        <!-- 翻牌动画 -->
        <div class="card-flip" :class="{ 'is-flipped': showFront }">
          <div class="card-flip__inner">
            <!-- 背面 -->
            <div class="card-flip__back">
              <div class="card-flip__back-text">{{ tenantStore.config?.themeConfig.brandName ?? '连山易' }}</div>
            </div>
            <!-- 正面 -->
            <div
              class="card-flip__front"
              :style="{
                borderColor: drawResult ? (wuXingColorMap[drawResult.card.stemWuXing] ?? '#c896b4') : '#c896b4',
                boxShadow: drawResult
                  ? `0 0 20px ${wuXingColorMap[drawResult.card.stemWuXing] ?? '#c896b4'}55`
                  : 'none',
              }"
            >
              <div
                class="card-flip__name"
                :style="{ color: drawResult ? (wuXingColorMap[drawResult.card.stemWuXing] ?? '#c896b4') : '#c896b4' }"
              >
                {{ drawResult?.card.name ?? '' }}
              </div>
              <div class="card-flip__nayin">{{ drawResult?.card.nayin ?? '' }}</div>
              <div v-if="drawResult" class="card-flip__seq">
                第{{ drawResult.card.sequence }}卦
              </div>
            </div>
          </div>
        </div>

        <!-- AI 解读 -->
        <div v-if="showFront && typedText" class="interp-container">
          <div class="interp-header">
            <span class="interp-icon">✦</span>
            <span class="interp-title">智慧解读</span>
          </div>
          <div class="interp-text">{{ typedText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── 页面容器 ───────────────────────────── */
.answer-page {
  background: linear-gradient(180deg, #2d1a2e 0%, #3d1f3e 50%, #4d1f4e 100%);
  min-height: 100vh;
}

.answer-page :deep(.van-nav-bar) {
  background: transparent;
}
.answer-page :deep(.van-nav-bar__title),
.answer-page :deep(.van-nav-bar__left) {
  color: rgba(200, 150, 180, 0.9);
}
.answer-page :deep(.van-icon) {
  color: rgba(200, 150, 180, 0.9);
}

/* ─── 主内容（玻璃卡片）────────────────── */
.main-content {
  margin: 10px 16px;
  padding: 15px 25px;
  border: 1px solid #c896b4;
  border-radius: 12px;
  background: rgba(45, 26, 46, 0.85);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 20px rgba(200, 150, 180, 0.3),
    inset 0 0 30px rgba(133, 76, 101, 0.1);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ─── 问题区 ─────────────────────────────── */
.question-container {
  width: 100%;
}

.question-label {
  font-size: 12px;
  color: #c896b4;
  margin-bottom: 6px;
  letter-spacing: 1px;
  opacity: 0.8;
}

.q-field :deep(.van-field__control) {
  color: #ffffff;
  font-size: 14px;
  background: transparent;
}

.q-field :deep(.van-field__control::placeholder) {
  color: rgba(200, 150, 180, 0.35);
}

.q-field :deep(.van-field__word-limit) {
  color: rgba(200, 150, 180, 0.4);
}

.q-field :deep(.van-cell) {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(200, 150, 180, 0.2);
}

/* ─── 档案选择 ───────────────────────────── */
.profile-section {
  width: 100%;
}

.profile-label {
  font-size: 12px;
  color: #c896b4;
  margin-bottom: 6px;
  letter-spacing: 1px;
  opacity: 0.8;
}

.profile-dropdown :deep(.van-dropdown-menu__bar) {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
  border-radius: 8px;
  border: 1px solid rgba(200, 150, 180, 0.2);
}

.profile-dropdown :deep(.van-dropdown-menu__title) {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.no-profile-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(200, 150, 180, 0.6);
}

.hint-link {
  color: #c896b4;
  cursor: pointer;
  text-decoration: underline;
}

/* ─── 抽卡按钮 ───────────────────────────── */
.draw-btn-wrap {
  width: 100%;
}

.btn-primary {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  border-radius: 8px;
  border: none;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(133, 76, 101, 0.4);
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ─── 结果区 ─────────────────────────────── */
.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

/* ─── 翻牌动画 ───────────────────────────── */
.card-flip {
  width: 130px;
  height: 182px;
  perspective: 800px;
}

.card-flip__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-flip.is-flipped .card-flip__inner {
  transform: rotateY(180deg);
}

.card-flip__front,
.card-flip__back {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid;
}

.card-flip__back {
  background: linear-gradient(135deg, #3d1a2e 0%, #6b3060 100%);
  border-color: rgba(200, 150, 180, 0.4);
}

.card-flip__back-text {
  font-size: 18px;
  font-weight: 800;
  color: #c896b4;
  letter-spacing: 3px;
  text-shadow: 0 0 8px rgba(200, 150, 180, 0.5);
}

.card-flip__front {
  background: rgba(26, 10, 0, 0.9);
  transform: rotateY(180deg);
  gap: 4px;
}

.card-flip__name {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 1;
  text-shadow: 0 0 8px currentColor;
}

.card-flip__nayin {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.card-flip__seq {
  font-size: 10px;
  color: rgba(200, 150, 180, 0.4);
}

/* ─── AI 解读 ────────────────────────────── */
.interp-container {
  width: 100%;
  background: linear-gradient(135deg, rgba(200, 150, 180, 0.1) 0%, rgba(160, 107, 127, 0.05) 100%);
  border: 1px solid rgba(200, 150, 180, 0.4);
  border-radius: 12px;
  padding: 14px;
  backdrop-filter: blur(5px);
}

.interp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.interp-icon {
  color: #c896b4;
  font-size: 13px;
}

.interp-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(200, 150, 180, 0.9);
  letter-spacing: 1px;
}

.interp-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.9;
  white-space: pre-wrap;
}
</style>
