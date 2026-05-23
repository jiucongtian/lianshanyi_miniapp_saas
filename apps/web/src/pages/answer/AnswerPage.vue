<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { drawCard } from '@/api/card.api'
import type { DrawCardRecord } from '@/types'

const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()

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
  // Pre-populate question from query param (comes from home page)
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
    <!-- Nav bar with dark style -->
    <van-nav-bar
      title="抽卡解读"
      left-arrow
      @click-left="router.back()"
    />

    <div class="answer-page__body">
      <!-- Question display / input -->
      <div class="answer-page__question-section">
        <div class="answer-page__q-label">您的问题</div>
        <div class="answer-page__q-wrap">
          <van-field
            v-model="question"
            type="textarea"
            placeholder="请输入您想占卜的问题，或留空"
            :autosize="{ minHeight: 60, maxHeight: 120 }"
            maxlength="100"
            show-word-limit
            class="answer-page__q-field"
          />
        </div>
      </div>

      <!-- Profile selector -->
      <div class="answer-page__section">
        <div class="answer-page__label">选择档案</div>
        <van-dropdown-menu>
          <van-dropdown-item
            v-model="selectedProfileId"
            :options="profileOptions.length ? profileOptions : [{ text: '暂无档案（游客模式）', value: '' }]"
          />
        </van-dropdown-menu>
        <div v-if="!profileOptions.length" class="answer-page__no-profile">
          <span>尚未创建档案，</span>
          <span class="answer-page__link" @click="router.push('/profiles/add')">立即创建</span>
        </div>
      </div>

      <!-- Draw button -->
      <div class="answer-page__draw-btn">
        <van-button
          block
          type="primary"
          round
          size="large"
          :loading="loading"
          loading-text="抽卡中..."
          @click="startDraw"
        >
          抽卡寻找答案
        </van-button>
      </div>

      <!-- Card flip animation + result -->
      <div v-if="isFlipping || drawResult" class="answer-page__result">
        <!-- Card flip -->
        <div class="card-flip" :class="{ 'is-flipped': showFront }">
          <div class="card-flip__inner">
            <!-- Back (initial face) -->
            <div class="card-flip__back">
              <div class="card-flip__back-text">联山易</div>
            </div>
            <!-- Front (revealed) -->
            <div
              class="card-flip__front"
              :style="{
                borderColor: drawResult ? (wuXingColorMap[drawResult.card.stemWuXing] ?? '#ffd27a') : '#ffd27a',
                boxShadow: drawResult
                  ? `0 0 24px ${wuXingColorMap[drawResult.card.stemWuXing] ?? '#ffd27a'}55`
                  : 'none',
              }"
            >
              <div
                class="card-flip__card-name"
                :style="{ color: drawResult ? (wuXingColorMap[drawResult.card.stemWuXing] ?? '#ffd27a') : '#ffd27a' }"
              >
                {{ drawResult?.card.name ?? '' }}
              </div>
              <div class="card-flip__card-nayin">{{ drawResult?.card.nayin ?? '' }}</div>
              <div class="card-flip__card-seq" v-if="drawResult">
                第{{ drawResult.card.sequence }}卦
              </div>
            </div>
          </div>
        </div>

        <!-- Interpretation -->
        <div v-if="showFront && typedText" class="answer-page__interpretation">
          <div class="answer-page__interp-header">
            <span class="answer-page__interp-icon">✦</span>
            <span class="answer-page__interp-title">智慧解读</span>
          </div>
          <div class="answer-page__interp-text">{{ typedText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.answer-page {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
}

.answer-page :deep(.van-nav-bar) {
  background: transparent;
}

.answer-page :deep(.van-nav-bar__title),
.answer-page :deep(.van-nav-bar__left) {
  color: #ffd27a;
}

.answer-page__body {
  padding: 12px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Question section */
.answer-page__question-section {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 210, 122, 0.2);
  border-radius: 16px;
  padding: 14px;
}

.answer-page__q-label {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.6);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.answer-page__q-field :deep(.van-field__control) {
  color: #ffeedd;
  font-size: 15px;
}

.answer-page__q-field :deep(.van-field__control::placeholder) {
  color: rgba(255, 220, 170, 0.35);
}

.answer-page__q-field :deep(.van-field__word-limit) {
  color: rgba(255, 210, 122, 0.4);
}

.answer-page__q-wrap :deep(.van-cell) {
  background: transparent;
  padding: 0;
}

/* Profile section */
.answer-page__section {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 210, 122, 0.15);
  border-radius: 16px;
  padding: 14px;
  overflow: hidden;
}

.answer-page__label {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.6);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.answer-page__section :deep(.van-dropdown-menu__bar) {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: none;
  border-radius: 8px;
}

.answer-page__section :deep(.van-dropdown-menu__title) {
  color: #ffeedd;
}

.answer-page__no-profile {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 220, 170, 0.6);
}

.answer-page__link {
  color: #ffd27a;
  cursor: pointer;
}

/* Draw button */
.answer-page__draw-btn :deep(.van-button--primary) {
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  border: none;
  font-size: 16px;
  letter-spacing: 2px;
  height: 50px;
  box-shadow: 0 4px 18px rgba(184, 107, 30, 0.5);
}

/* ─── Card flip ──────────────────────────── */
.card-flip {
  width: 160px;
  height: 210px;
  margin: 8px auto 0;
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
  border-radius: 20px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid;
}

.card-flip__back {
  background: linear-gradient(135deg, #3d1a00 0%, #8b4513 100%);
  border-color: rgba(255, 210, 122, 0.4);
}

.card-flip__back-text {
  font-size: 22px;
  font-weight: 800;
  color: #ffd27a;
  letter-spacing: 4px;
}

.card-flip__front {
  background: rgba(26, 10, 0, 0.9);
  transform: rotateY(180deg);
  gap: 6px;
}

.card-flip__card-name {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: 4px;
  line-height: 1;
}

.card-flip__card-nayin {
  font-size: 13px;
  color: rgba(255, 220, 170, 0.6);
}

.card-flip__card-seq {
  font-size: 11px;
  color: rgba(255, 210, 122, 0.4);
}

/* ─── Interpretation ─────────────────────── */
.answer-page__interpretation {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 210, 122, 0.15);
  border-radius: 16px;
  padding: 16px;
  margin-top: 4px;
}

.answer-page__interp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.answer-page__interp-icon {
  color: #ffd27a;
  font-size: 14px;
}

.answer-page__interp-title {
  font-size: 15px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 1px;
}

.answer-page__interp-text {
  font-size: 15px;
  color: rgba(255, 220, 170, 0.85);
  line-height: 1.9;
  white-space: pre-wrap;
}
</style>
