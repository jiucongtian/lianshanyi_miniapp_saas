<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useProfileStore } from '@/stores/profile.store'
import { drawCard } from '@/api/card.api'
import type { DrawCardRecord } from '@/types'

const router = useRouter()
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
      // Start flip animation
      isFlipping.value = true
      setTimeout(() => {
        showFront.value = true
        // Start typing animation
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

const wuXingBgMap: Record<string, string> = {
  木: '#E8F5E9',
  火: '#FFEBEE',
  土: '#FFFDE7',
  金: '#F5F5F5',
  水: '#E3F2FD',
}

const wuXingColorMap: Record<string, string> = {
  木: '#2E7D32',
  火: '#C62828',
  土: '#F9A825',
  金: '#616161',
  水: '#1565C0',
}
</script>

<template>
  <div class="answer-page page-container--no-tabbar">
    <van-nav-bar
      title="抽卡解读"
      left-arrow
      @click-left="router.back()"
    />

    <div class="answer-page__body">
      <!-- Profile selector -->
      <div class="answer-page__section">
        <div class="answer-page__label">选择档案</div>
        <van-dropdown-menu>
          <van-dropdown-item
            v-model="selectedProfileId"
            :options="profileOptions.length ? profileOptions : [{ text: '暂无档案', value: '' }]"
          />
        </van-dropdown-menu>
        <div v-if="!profileOptions.length" class="answer-page__no-profile">
          <span>尚未创建档案，</span>
          <span class="answer-page__link" @click="router.push('/profiles/add')">立即创建</span>
        </div>
      </div>

      <!-- Question input -->
      <div class="answer-page__section">
        <div class="answer-page__label">您的疑问（可选）</div>
        <van-field
          v-model="question"
          type="textarea"
          placeholder="请输入您想占卜的问题，如：近期事业运势如何？"
          :autosize="{ minHeight: 80 }"
          maxlength="200"
          show-word-limit
        />
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
          开始抽卡
        </van-button>
      </div>

      <!-- Card flip animation + result -->
      <div v-if="isFlipping || drawResult" class="answer-page__result">
        <!-- Card flip -->
        <div class="card-flip" :class="{ 'is-flipped': showFront }">
          <div class="card-flip__inner">
            <!-- Back -->
            <div class="card-flip__back">
              <div class="card-flip__back-content">
                <div class="card-flip__back-text">联山易</div>
              </div>
            </div>
            <!-- Front -->
            <div
              class="card-flip__front"
              :style="{
                backgroundColor: drawResult ? wuXingBgMap[drawResult.card.stemWuXing] : '#fff8f0',
                borderColor: drawResult ? wuXingColorMap[drawResult.card.stemWuXing] : '#8B4513',
              }"
            >
              <div
                class="card-flip__card-name"
                :style="{ color: drawResult ? wuXingColorMap[drawResult.card.stemWuXing] : '#8B4513' }"
              >
                {{ drawResult?.card.name ?? '' }}
              </div>
              <div class="card-flip__card-nayin">{{ drawResult?.card.nayin ?? '' }}</div>
            </div>
          </div>
        </div>

        <!-- Interpretation -->
        <div v-if="showFront && typedText" class="answer-page__interpretation">
          <div class="answer-page__interp-title">AI 解读</div>
          <div class="answer-page__interp-text">{{ typedText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.answer-page {
  background: var(--color-bg);
}

.answer-page__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-page__section {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}

.answer-page__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 10px;
}

.answer-page__no-profile {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.answer-page__link {
  color: var(--color-primary);
  cursor: pointer;
}

.answer-page__draw-btn {
  padding: 0 4px;
}

/* Card flip styles */
.card-flip {
  width: 160px;
  height: 200px;
  margin: 0 auto;
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
  border-radius: 16px;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid;
}

.card-flip__back {
  background: linear-gradient(135deg, #8b4513 0%, #d4873b 100%);
  border-color: #8b4513;
}

.card-flip__back-text {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 4px;
}

.card-flip__front {
  transform: rotateY(180deg);
}

.card-flip__card-name {
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 4px;
}

.card-flip__card-nayin {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

.answer-page__interpretation {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
}

.answer-page__interp-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 10px;
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}

.answer-page__interp-text {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.85;
  white-space: pre-wrap;
}
</style>
