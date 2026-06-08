<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { interpretCard } from '@/api/card.api'

// ─── Card dimensions (matches mini program: rpx÷2 → px) ─────────────────────
const CARD_WIDTH = 130    // px  (260rpx)
const CARD_GAP   = 13     // px  (26rpx)
const CARD_HEIGHT = 224   // px  (447rpx)
const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_GAP  // 143px

// ─── State ───────────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()

const question    = ref('')
const tianGan     = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

// card scroll
const cardList          = ref(Array.from({ length: 10 }, (_, i) => ({ id: i, key: `card_${i}` })))
let   nextCardId        = 10
const scrollOffset      = ref(0)
const selectedIndex     = ref(2)
const isFlipped         = ref(false)
const transitionDuration = ref(0)
const transitionTiming  = ref('linear')
const selectedCardNum   = ref<number | null>(null)   // 1-60

// phase
const showDrawButton      = ref(true)
const showInterpretButton = ref(false)
const showShareButton     = ref(false)

// ai
const aiInterpretation  = ref('')
const isDrawingCard     = ref(false)
const isInterpreting    = ref(false)
const interpretProgress = ref('解读中...')

// container ref
const scrollWrapperRef = ref<HTMLElement | null>(null)
let   containerWidth   = 293   // fallback for 375px screen
let   centerX          = 146.5

function initCardLayout() {
  if (scrollWrapperRef.value) {
    containerWidth = scrollWrapperRef.value.offsetWidth
    centerX = containerWidth / 2
  }
  const selectedCardCenterX = selectedIndex.value * TOTAL_CARD_WIDTH + CARD_WIDTH / 2
  scrollOffset.value = centerX - selectedCardCenterX
}

onMounted(() => {
  if (route.query.question && typeof route.query.question === 'string') {
    question.value = route.query.question
  }
  nextTick(initCardLayout)
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cardImageUrl(cardNum: number): string {
  return `/cards/${String(cardNum).padStart(2, '0')}.png`
}

function selectRandomCardNum(): number {
  return Math.floor(Math.random() * 60) + 1
}

// ─── Draw card ───────────────────────────────────────────────────────────────
async function onDrawCard() {
  if (isDrawingCard.value) return
  isDrawingCard.value = true

  // If already flipped, reset to fresh state first
  if (isFlipped.value) {
    isFlipped.value = false
    await new Promise(r => setTimeout(r, 600))
    selectedCardNum.value   = null
    aiInterpretation.value  = ''
    showInterpretButton.value = false
    showShareButton.value     = false
    showDrawButton.value      = true
  }

  selectedCardNum.value = selectRandomCardNum()
  startDrawAnimation()
}

function startDrawAnimation() {
  const scrollCount   = 5
  const scrollDist    = scrollCount * TOTAL_CARD_WIDTH
  const targetIdx     = selectedIndex.value + scrollCount
  const newOffset     = scrollOffset.value - scrollDist

  transitionDuration.value = 2000
  transitionTiming.value   = 'cubic-bezier(0.33, 0, 0.2, 1)'
  scrollOffset.value       = newOffset
  selectedIndex.value      = targetIdx

  setTimeout(() => {
    // Rebuild card queue: remove first 5, append 5 new
    const list = [...cardList.value]
    list.splice(0, scrollCount)
    for (let i = 0; i < scrollCount; i++) {
      list.push({ id: nextCardId, key: `card_${nextCardId}` })
      nextCardId++
    }
    const newIdx             = targetIdx - scrollCount
    const newCenterX         = newIdx * TOTAL_CARD_WIDTH + CARD_WIDTH / 2
    transitionDuration.value = 0
    transitionTiming.value   = 'linear'
    cardList.value           = list
    scrollOffset.value       = centerX - newCenterX
    selectedIndex.value      = newIdx

    setTimeout(() => {
      isFlipped.value         = true
      showDrawButton.value    = false
      showInterpretButton.value = true
      isDrawingCard.value     = false
    }, 50)
  }, 2000)
}

// ─── AI interpret ─────────────────────────────────────────────────────────────
let progressTimer: ReturnType<typeof setInterval> | null = null
const PROGRESS_STAGES = [
  '正在分析卡牌信息…',
  '调取AI知识库…',
  '深度思考中…',
  '正在优化内容…',
]

function startProgress() {
  let idx = 0
  interpretProgress.value = PROGRESS_STAGES[0]!
  progressTimer = setInterval(() => {
    idx = (idx + 1) % PROGRESS_STAGES.length
    interpretProgress.value = PROGRESS_STAGES[idx]!
  }, 4000)
}

function stopProgress() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
  interpretProgress.value = '解读中...'
}

async function onAIInterpret() {
  if (isInterpreting.value || !selectedCardNum.value) return
  isInterpreting.value = true
  startProgress()

  try {
    const res = await interpretCard({
      cardId:   selectedCardNum.value,
      question: question.value || undefined,
    })

    if (res.data?.success && res.data.data) {
      aiInterpretation.value    = res.data.data.interpretation
      showInterpretButton.value = false
      showShareButton.value     = true
    } else {
      showToast({ type: 'fail', message: res.data?.error ?? 'AI解读失败' })
    }
  } catch {
    showToast({ type: 'fail', message: 'AI解读失败，请重试' })
  } finally {
    isInterpreting.value = false
    stopProgress()
  }
}
</script>

<template>
  <div class="page-container">
    <!-- 导航栏 -->
    <van-nav-bar
      title="智慧洞见"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 主内容卡片 -->
    <div class="main-content">

      <!-- 问题展示（只读，有问题才显示） -->
      <div v-if="question" class="question-container">
        <div class="question-label">你的问题</div>
        <div class="question-text">{{ question }}</div>
      </div>

      <!-- 曼陀罗动画 -->
      <div class="mandala-container">
        <div class="mandala">
          <div class="glow-effect"></div>
          <div class="ring ring-1"><div class="ring-mark"><div class="mark-dot"></div></div></div>
          <div class="ring ring-2"><div class="ring-mark"><div class="mark-dot mark-dot-sm"></div></div></div>
          <div class="ring ring-3"><div class="ring-mark"><div class="mark-dot"></div></div></div>
          <div class="ring ring-4"><div class="ring-mark"><div class="mark-dot mark-dot-sm"></div></div></div>
          <div class="tiangan-container">
            <div v-for="(char, i) in tianGan" :key="i" class="tiangan-item" :class="`orbit-${i + 1}`">
              <span class="tiangan-text">{{ char }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 卡牌滚动区 -->
      <div class="card-draw-container">
        <div class="cards-scroll-wrapper" ref="scrollWrapperRef">
          <div
            class="cards-scroll"
            :style="{
              transform: `translateX(${scrollOffset}px)`,
              transition: transitionDuration > 0
                ? `transform ${transitionDuration}ms ${transitionTiming}`
                : 'none',
            }"
          >
            <div
              v-for="(card, cardIndex) in cardList"
              :key="card.key"
              class="card-item"
              :class="{ selected: cardIndex === selectedIndex }"
            >
              <div
                class="card-inner"
                :class="{ flipped: cardIndex === selectedIndex && isFlipped }"
              >
                <div class="card-back">
                  <img src="/cards/back.jpg" alt="" class="card-img" />
                </div>
                <div class="card-front">
                  <img
                    v-if="selectedCardNum && cardIndex === selectedIndex"
                    :src="cardImageUrl(selectedCardNum)"
                    alt=""
                    class="card-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 解读结果 -->
      <div v-if="aiInterpretation" class="ai-result-container">
        <div class="result-title">AI 深度洞察</div>
        <div class="result-content">{{ aiInterpretation }}</div>
      </div>

      <!-- 按钮区 -->
      <div class="button-container">
        <!-- 抽卡按钮 -->
        <button
          v-if="showDrawButton"
          class="btn-primary"
          :disabled="isDrawingCard"
          @click="onDrawCard"
        >
          {{ isDrawingCard ? '抽卡中...' : '抽卡' }}
        </button>

        <!-- AI 解读按钮 -->
        <div v-if="showInterpretButton" class="interpret-wrapper">
          <div class="interpret-hint">AI解读时间较长，预计40秒左右，请耐心等待</div>
          <button
            class="btn-secondary"
            :disabled="isInterpreting"
            @click="onAIInterpret"
          >
            <van-loading v-if="isInterpreting" size="16" color="#c896b4" style="margin-right:6px" />
            {{ isInterpreting ? interpretProgress : 'AI解读' }}
          </button>
        </div>

        <!-- 再次抽卡按钮 -->
        <button
          v-if="showShareButton"
          class="btn-secondary"
          @click="onDrawCard"
        >
          再次抽卡
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ─── 页面 ─────────────────────────────────── */
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #2d1a2e 0%, #3d1f3e 50%, #4d1f4e 100%);
  display: flex;
  flex-direction: column;
}

.page-container :deep(.van-nav-bar) { background: transparent; }
.page-container :deep(.van-nav-bar__title),
.page-container :deep(.van-nav-bar__left) { color: rgba(200,150,180,0.9); }
.page-container :deep(.van-icon) { color: rgba(200,150,180,0.9); }

/* ─── 主卡片 ───────────────────────────────── */
.main-content {
  flex: 1;
  margin: 10px 16px;
  padding: 15px 25px;
  border: 1px solid #c896b4;
  border-radius: 12px;
  background: rgba(45,26,46,0.85);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(200,150,180,0.3), inset 0 0 30px rgba(133,76,101,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* ─── 问题区 ───────────────────────────────── */
.question-container {
  width: 100%;
  padding: 10px 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.question-label {
  font-size: 12px;
  color: #c896b4;
  opacity: 0.8;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.question-text {
  font-size: 16px;
  color: #fff;
  text-align: center;
  line-height: 1.6;
  word-break: break-all;
}

/* ─── 曼陀罗 ───────────────────────────────── */
.mandala-container {
  width: 100%;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.mandala {
  position: relative;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glow-effect {
  position: absolute;
  width: 158px;
  height: 158px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,150,180,0.15) 0%, transparent 70%);
  animation: glowPulse 9s ease-in-out infinite;
}

@keyframes glowPulse {
  0%,100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.8; transform: scale(1.1); }
}

/* 圆环 */
.ring {
  position: absolute;
  border-radius: 50%;
  box-sizing: border-box;
}

.ring-mark {
  position: absolute;
  top: 0; left: 50%;
  transform-origin: 0 50%;
  width: 0; height: 0;
}

.mark-dot {
  position: absolute;
  width: 8px; height: 8px;
  background: #c896b4;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(200,150,180,0.9);
  top: -4px; left: -4px;
}

.mark-dot-sm { width: 7px; height: 7px; top: -3.5px; left: -3.5px; }

.ring-1 {
  width: 150px; height: 150px;
  border: 1.5px solid #c896b4;
  animation: rotCW 60s linear infinite;
}
.ring-2 {
  width: 128px; height: 128px;
  border: 1px dashed #c896b4;
  animation: rotCCW 53s linear infinite;
}
.ring-3 {
  width: 105px; height: 105px;
  border: 1px solid #c896b4;
  animation: rotCW 45s linear infinite;
}
.ring-4 {
  width: 83px; height: 83px;
  border: 1px dashed #c896b4;
  animation: rotCCW 57s linear infinite;
}

@keyframes rotCW  { to { transform: rotate(360deg); } }
@keyframes rotCCW { to { transform: rotate(-360deg); } }

/* 天干 */
.tiangan-container {
  position: absolute;
  width: 75px; height: 75px;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}

.tiangan-item {
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0;
}

.tiangan-text {
  position: absolute;
  font-size: 12px;
  color: #c896b4;
  font-weight: 600;
  text-shadow: 0 0 4px rgba(200,150,180,0.8);
  white-space: nowrap;
  transform: translate(-50%,-50%);
}

/* 每个天干独立轨道动画（orbit radius 26px） */
.orbit-1  { animation: tg1  53s linear infinite; }
.orbit-2  { animation: tg2  53s linear infinite; }
.orbit-3  { animation: tg3  53s linear infinite; }
.orbit-4  { animation: tg4  53s linear infinite; }
.orbit-5  { animation: tg5  53s linear infinite; }
.orbit-6  { animation: tg6  53s linear infinite; }
.orbit-7  { animation: tg7  53s linear infinite; }
.orbit-8  { animation: tg8  53s linear infinite; }
.orbit-9  { animation: tg9  53s linear infinite; }
.orbit-10 { animation: tg10 53s linear infinite; }

@keyframes tg1  { 0%{transform:rotate(18deg)  translateX(26px) rotate(-18deg) }  100%{transform:rotate(378deg)  translateX(26px) rotate(-378deg) } }
@keyframes tg2  { 0%{transform:rotate(54deg)  translateX(26px) rotate(-54deg) }  100%{transform:rotate(414deg)  translateX(26px) rotate(-414deg) } }
@keyframes tg3  { 0%{transform:rotate(90deg)  translateX(26px) rotate(-90deg) }  100%{transform:rotate(450deg)  translateX(26px) rotate(-450deg) } }
@keyframes tg4  { 0%{transform:rotate(126deg) translateX(26px) rotate(-126deg)}  100%{transform:rotate(486deg)  translateX(26px) rotate(-486deg) } }
@keyframes tg5  { 0%{transform:rotate(162deg) translateX(26px) rotate(-162deg)}  100%{transform:rotate(522deg)  translateX(26px) rotate(-522deg) } }
@keyframes tg6  { 0%{transform:rotate(198deg) translateX(26px) rotate(-198deg)}  100%{transform:rotate(558deg)  translateX(26px) rotate(-558deg) } }
@keyframes tg7  { 0%{transform:rotate(234deg) translateX(26px) rotate(-234deg)}  100%{transform:rotate(594deg)  translateX(26px) rotate(-594deg) } }
@keyframes tg8  { 0%{transform:rotate(270deg) translateX(26px) rotate(-270deg)}  100%{transform:rotate(630deg)  translateX(26px) rotate(-630deg) } }
@keyframes tg9  { 0%{transform:rotate(306deg) translateX(26px) rotate(-306deg)}  100%{transform:rotate(666deg)  translateX(26px) rotate(-666deg) } }
@keyframes tg10 { 0%{transform:rotate(342deg) translateX(26px) rotate(-342deg)}  100%{transform:rotate(702deg)  translateX(26px) rotate(-702deg) } }

/* ─── 卡牌区 ───────────────────────────────── */
.card-draw-container {
  width: 100%;
  height: 250px;
  position: relative;
  flex-shrink: 0;
}

.cards-scroll-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.cards-scroll {
  display: flex;
  align-items: center;
  height: 100%;
  will-change: transform;
}

.card-item {
  width: 130px;
  height: 224px;
  margin-right: 13px;
  flex-shrink: 0;
  perspective: 500px;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease-in-out;
}

.card-inner.flipped { transform: rotateY(180deg); }

.card-back,
.card-front {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  overflow: hidden;
  backface-visibility: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.card-front { transform: rotateY(180deg); }

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ─── AI 解读结果 ───────────────────────────── */
.ai-result-container {
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(200,150,180,0.1) 0%, rgba(160,107,127,0.05) 100%);
  border: 1px solid rgba(200,150,180,0.4);
  border-radius: 10px;
  backdrop-filter: blur(5px);
}

.result-title {
  font-size: 15px;
  color: #fff;
  font-weight: 600;
  text-align: center;
  margin-bottom: 10px;
}

.result-content {
  font-size: 14px;
  color: rgba(255,255,255,0.9);
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ─── 按钮区 ───────────────────────────────── */
.button-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
  padding-bottom: 8px;
}

.interpret-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.interpret-hint {
  font-size: 11px;
  color: rgba(200,150,180,0.8);
  text-align: center;
  line-height: 1.5;
}

.btn-primary {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #854C65 0%, #A06B7F 100%);
  border-radius: 8px;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(133,76,101,0.4);
  transition: opacity 0.2s;
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  width: 100%;
  height: 44px;
  background: transparent;
  border: 1px solid #c896b4;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
