<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const currentTab = ref<'wisdom' | 'daily'>('wisdom')
const question = ref('')

const outerPatterns = Array.from({ length: 36 }, (_, i) => i)
const middlePatterns = Array.from({ length: 16 }, (_, i) => i)

const exampleQuestions = [
  '我的事业发展方向是否正确？',
  '我和他/她是否有缘份？',
  '这次投资决策是否明智？',
  '我是否应该换工作？',
  '我和伴侣的感情走向如何？',
  '我的健康状况需要注意什么？',
  '这段关系值得继续吗？',
  '我的财运今年如何？',
  '应该接受这份工作机会吗？',
  '我和家人的矛盾如何化解？',
  '这个项目能否顺利完成？',
  '我是否适合创业？',
  '我的学业前途如何？',
  '搬家是否会带来好运？',
  '我的贵人在哪个方位？',
]

function onFindAnswer() {
  router.push({ path: '/answer', query: question.value ? { question: question.value } : {} })
}

function onNavigateToDailyInsight() {
  router.push('/daily-insight')
}
</script>

<template>
  <div class="home-page">
    <!-- 背景彗星装饰 -->
    <div class="bg-decoration" aria-hidden="true">
      <div class="star-trail trail-1"></div>
      <div class="star-trail trail-2"></div>
      <div class="star-trail trail-3"></div>
      <div class="star-trail trail-4"></div>
      <div class="star-trail trail-5"></div>
      <div class="star-trail trail-6"></div>
      <div class="star-trail trail-7"></div>
      <div class="star-trail trail-8"></div>
    </div>

    <!-- 主内容卡片 -->
    <div class="main-card">
      <!-- Tab 导航 -->
      <div class="tab-nav">
        <div
          class="tab-item"
          :class="{ active: currentTab === 'wisdom' }"
          @click="currentTab = 'wisdom'"
        >
          <span class="tab-text">智慧洞见</span>
        </div>
        <div
          class="tab-item"
          :class="{ active: currentTab === 'daily' }"
          @click="currentTab = 'daily'"
        >
          <span class="tab-text">每日愈见</span>
        </div>
      </div>

      <!-- 智慧洞见 -->
      <div v-show="currentTab === 'wisdom'" class="tab-content">
        <!-- 卡片标题 -->
        <div class="card-title">
          <span class="title-main">智慧洞见</span>
          <span class="title-sub">Wisdom and Insight</span>
        </div>

        <!-- 曼陀罗装饰 -->
        <div class="mandala-container">
          <div class="mandala">
            <!-- 最外层 V 形图案环 -->
            <div class="ring ring-outer-1">
              <div
                v-for="i in outerPatterns"
                :key="`o1-${i}`"
                class="pattern pattern-v"
                :style="{ transform: `rotate(${i * 10}deg)` }"
              ></div>
            </div>
            <!-- 第二层 V 形图案环 -->
            <div class="ring ring-outer-2">
              <div
                v-for="i in outerPatterns"
                :key="`o2-${i}`"
                class="pattern pattern-v"
                :style="{ transform: `rotate(${i * 10}deg)` }"
              ></div>
            </div>
            <!-- 中间心形图案环 -->
            <div class="ring ring-middle">
              <div
                v-for="i in middlePatterns"
                :key="`m-${i}`"
                class="pattern pattern-heart"
                :style="{ transform: `rotate(${i * 22.5}deg)` }"
              ></div>
            </div>
            <!-- 中心星形 -->
            <div class="ring ring-inner">
              <div class="pattern-star"></div>
            </div>
          </div>
        </div>

        <!-- 提示文字 -->
        <div class="instruction-text">心中默念，思考你的问题:</div>

        <!-- 示例问题垂直滚动 -->
        <div class="example-question-container">
          <div class="example-question-swiper">
            <div class="example-question-wrapper">
              <div
                v-for="(q, idx) in exampleQuestions"
                :key="idx"
                class="example-question-item"
              >
                <span class="example-question">{{ q }}</span>
              </div>
              <!-- 无缝循环：复制第一条 -->
              <div class="example-question-item">
                <span class="example-question">{{ exampleQuestions[0] }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="prompt-text">智慧洞见之门已打开，你准备好提问了吗？</div>

        <!-- 输入框 -->
        <div class="input-container">
          <input
            v-model="question"
            class="question-input"
            placeholder="说出你的问题，实在没有空着也行！"
            maxlength="50"
            @keyup.enter="onFindAnswer"
          />
        </div>

        <!-- 按钮 -->
        <div class="button-container">
          <button class="find-answer-btn" @click="onFindAnswer">
            抽卡寻找答案
          </button>
        </div>
      </div>

      <!-- 每日愈见 -->
      <div v-show="currentTab === 'daily'" class="tab-content">
        <!-- 卡片标题 -->
        <div class="card-title">
          <span class="title-main">每日愈见</span>
          <span class="title-sub">Daily Healing</span>
        </div>

        <!-- 每日愈见入口卡 -->
        <div class="daily-content" @click="onNavigateToDailyInsight">
          <div class="daily-entry-card">
            <!-- 装饰圆圈 -->
            <div class="daily-entry-decoration" aria-hidden="true">
              <div class="decoration-circle circle-1"></div>
              <div class="decoration-circle circle-2"></div>
              <div class="decoration-circle circle-3"></div>
            </div>

            <!-- 主内容 -->
            <div class="daily-entry-content">
              <div class="daily-entry-icon">🌸</div>
              <div class="daily-entry-text-wrapper">
                <span class="daily-entry-title">今日治愈</span>
                <span class="daily-entry-subtitle">获取今日的治愈与启发</span>
              </div>
            </div>

            <!-- 底部提示 -->
            <div class="daily-entry-footer">
              <span class="daily-entry-hint">点击进入</span>
              <span class="daily-entry-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── 页面容器 ───────────────────────────── */
.home-page {
  height: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #2d1a2e 0%, #3d1f3e 50%, #4d1f4e 100%);
  position: relative;
  overflow: hidden;
  padding: 0 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

/* ─── 背景彗星 ───────────────────────────── */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
}

.star-trail {
  position: absolute;
  width: 2px;
  height: 140px;
  border-radius: 1px;
  transform-origin: center;
  opacity: 0;
}

/* 彗星颜色定义 */
.trail-1 {
  background: linear-gradient(to bottom,
    rgba(255,255,255,1) 0%, rgba(255,255,255,1) 5%,
    rgba(255,255,255,0.9) 10%, rgba(255,255,255,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(255,255,255,0.9);
  left: 99%; top: 1%;
  animation: trailMove1 12.6s linear infinite 0s;
}
.trail-1::before { background: #fff; box-shadow: 0 0 10px rgba(255,255,255,1); }

.trail-2 {
  background: linear-gradient(to bottom,
    rgba(173,216,230,1) 0%, rgba(173,216,230,1) 5%,
    rgba(173,216,230,0.9) 10%, rgba(173,216,230,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(173,216,230,0.9);
  left: 60%; top: 3%;
  animation: trailMove2 24.75s linear infinite 3s;
}
.trail-2::before { background: #add8e6; box-shadow: 0 0 10px rgba(173,216,230,1); }

.trail-3 {
  background: linear-gradient(to bottom,
    rgba(221,160,221,1) 0%, rgba(221,160,221,1) 5%,
    rgba(221,160,221,0.9) 10%, rgba(221,160,221,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(221,160,221,0.9);
  left: 92%; top: 4%;
  animation: trailMove3 14.4s linear infinite 6s;
}
.trail-3::before { background: #dda0dd; box-shadow: 0 0 10px rgba(221,160,221,1); }

.trail-4 {
  background: linear-gradient(to bottom,
    rgba(255,255,224,1) 0%, rgba(255,255,224,1) 5%,
    rgba(255,255,224,0.9) 10%, rgba(255,255,224,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(255,255,224,0.9);
  left: 97%; top: 20%;
  animation: trailMove4 21.6s linear infinite 9s;
}
.trail-4::before { background: #ffffe0; box-shadow: 0 0 10px rgba(255,255,224,1); }

.trail-5 {
  background: linear-gradient(to bottom,
    rgba(144,238,144,1) 0%, rgba(144,238,144,1) 5%,
    rgba(144,238,144,0.9) 10%, rgba(144,238,144,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(144,238,144,0.9);
  left: 75%; top: 8%;
  animation: trailMove5 11.25s linear infinite 12s;
}
.trail-5::before { background: #90ee90; box-shadow: 0 0 10px rgba(144,238,144,1); }

.trail-6 {
  background: linear-gradient(to bottom,
    rgba(255,192,203,1) 0%, rgba(255,192,203,1) 5%,
    rgba(255,192,203,0.9) 10%, rgba(255,192,203,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(255,192,203,0.9);
  left: 94%; top: 30%;
  animation: trailMove6 27s linear infinite 15s;
}
.trail-6::before { background: #ffc0cb; box-shadow: 0 0 10px rgba(255,192,203,1); }

.trail-7 {
  background: linear-gradient(to bottom,
    rgba(175,238,238,1) 0%, rgba(175,238,238,1) 5%,
    rgba(175,238,238,0.9) 10%, rgba(175,238,238,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(175,238,238,0.9);
  left: 65%; top: 15%;
  animation: trailMove7 16.65s linear infinite 18s;
}
.trail-7::before { background: #afeeee; box-shadow: 0 0 10px rgba(175,238,238,1); }

.trail-8 {
  background: linear-gradient(to bottom,
    rgba(255,218,185,1) 0%, rgba(255,218,185,1) 5%,
    rgba(255,218,185,0.9) 10%, rgba(255,218,185,0.5) 40%, transparent 100%);
  box-shadow: 0 0 8px rgba(255,218,185,0.9);
  left: 82%; top: 22%;
  animation: trailMove8 19.35s linear infinite 21s;
}
.trail-8::before { background: #ffdab9; box-shadow: 0 0 10px rgba(255,218,185,1); }

/* 彗星头部高亮点 */
.star-trail::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  z-index: 1;
}

/* 彗星动画：从右上角沿 -135° 飞向左下角 */
@keyframes trailMove1 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-600px,600px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove2 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-650px,650px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove3 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-625px,625px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove4 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-675px,675px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove5 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-590px,590px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove6 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-700px,700px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove7 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-640px,640px) rotate(-135deg); opacity: 0; }
}
@keyframes trailMove8 {
  0%   { transform: translate(0,0) rotate(-135deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate(-660px,660px) rotate(-135deg); opacity: 0; }
}

/* ─── 主内容卡片（玻璃风格） ─────────────── */
.main-card {
  background: rgba(45, 26, 46, 0.6);
  backdrop-filter: blur(2px);
  border: 2px solid #c896b4;
  border-radius: 12px;
  padding: 24px 26px 40px;
  margin-top: 75px;
  position: relative;
  z-index: 10;
  box-shadow:
    0 0 20px rgba(200, 150, 180, 0.3),
    inset 0 0 30px rgba(133, 76, 101, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Tab 导航 ───────────────────────────── */
.tab-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.tab-item {
  position: relative;
  padding: 8px 12px;
  cursor: pointer;
}

.tab-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.tab-item.active .tab-text {
  color: #ffffff;
  font-weight: 500;
}

.tab-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #c896b4, transparent);
  border-radius: 1px;
  transition: transform 0.3s ease;
}

.tab-item.active::after {
  transform: translateX(-50%) scaleX(1);
}

/* ─── Tab 内容区 ─────────────────────────── */
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── 卡片标题 ───────────────────────────── */
.card-title {
  text-align: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.title-main {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 6px;
  letter-spacing: 2px;
}

.title-sub {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
}

/* ─── 曼陀罗 ─────────────────────────────── */
.mandala-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 12px 0;
  height: 150px;
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

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.ring-outer-1 { width: 150px; height: 150px; }
.ring-outer-2 { width: 128px; height: 128px; }
.ring-middle  { width: 90px;  height: 90px;  }
.ring-inner   { width: 45px;  height: 45px;  }

.pattern {
  position: absolute;
  top: 0;
  left: 50%;
  transform-origin: 0 50%;
}

.pattern-v {
  width: 4px;
  height: 10px;
  background: linear-gradient(to bottom, #c896b4, transparent);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  margin-left: -2px;
}

.pattern-heart {
  width: 8px;
  height: 8px;
  background: #c896b4;
  border-radius: 50% 50% 50% 0;
  margin-left: -4px;
  margin-top: -4px;
}

.pattern-star {
  width: 40px;
  height: 40px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

/* ─── 提示文字 ───────────────────────────── */
.instruction-text {
  font-size: 14px;
  color: #ffffff;
  text-align: center;
  margin: 10px 0 6px;
  letter-spacing: 1px;
  flex-shrink: 0;
}

/* ─── 示例问题垂直滚动 ───────────────────── */
.example-question-container {
  height: 25px;
  margin: 6px 0 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.example-question-swiper {
  width: 100%;
  height: 25px;
  overflow: hidden;
  pointer-events: none;
}

.example-question-wrapper {
  display: flex;
  flex-direction: column;
  /* 15 条 × 6.3s（停留6s + 滚动0.3s）= 94.5s */
  animation: scrollQuestions 94.5s linear infinite;
  will-change: transform;
}

.example-question-item {
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.example-question {
  font-size: 14px;
  color: #c896b4;
  text-align: center;
  line-height: 25px;
  width: 100%;
  text-shadow: 0 0 4px rgba(200, 150, 180, 0.5);
}

/* 每条停留6s，滚动0.3s，共15条 + 1复制 */
@keyframes scrollQuestions {
  0%, 6.35%      { transform: translateY(0); }
  6.67%          { transform: translateY(-25px); }
  6.67%, 13.02%  { transform: translateY(-25px); }
  13.33%         { transform: translateY(-50px); }
  13.33%, 19.68% { transform: translateY(-50px); }
  20%            { transform: translateY(-75px); }
  20%, 26.35%    { transform: translateY(-75px); }
  26.67%         { transform: translateY(-100px); }
  26.67%, 33.02% { transform: translateY(-100px); }
  33.33%         { transform: translateY(-125px); }
  33.33%, 39.68% { transform: translateY(-125px); }
  40%            { transform: translateY(-150px); }
  40%, 46.35%    { transform: translateY(-150px); }
  46.67%         { transform: translateY(-175px); }
  46.67%, 53.02% { transform: translateY(-175px); }
  53.33%         { transform: translateY(-200px); }
  53.33%, 59.68% { transform: translateY(-200px); }
  60%            { transform: translateY(-225px); }
  60%, 66.35%    { transform: translateY(-225px); }
  66.67%         { transform: translateY(-250px); }
  66.67%, 73.02% { transform: translateY(-250px); }
  73.33%         { transform: translateY(-275px); }
  73.33%, 79.68% { transform: translateY(-275px); }
  80%            { transform: translateY(-300px); }
  80%, 86.35%    { transform: translateY(-300px); }
  86.67%         { transform: translateY(-325px); }
  86.67%, 93.02% { transform: translateY(-325px); }
  93.33%         { transform: translateY(-350px); }
  93.33%, 99.68% { transform: translateY(-350px); }
  100%           { transform: translateY(-375px); }
}

/* ─── 引导文字 ───────────────────────────── */
.prompt-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

/* ─── 输入框 ─────────────────────────────── */
.input-container {
  margin: 10px 0;
  flex-shrink: 0;
}

.question-input {
  width: 100%;
  height: 44px;
  background: #ffffff;
  border-radius: 8px;
  border: none;
  padding: 0 16px;
  font-size: 14px;
  color: #333333;
  box-sizing: border-box;
  outline: none;
}

.question-input::placeholder {
  color: #999999;
}

/* ─── 抽卡按钮（呼吸动画）────────────────── */
.button-container {
  margin: 12px 0 8px;
  flex-shrink: 0;
}

.find-answer-btn {
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
  box-shadow: 0 4px 12px rgba(133, 76, 101, 0.4);
  animation: breathe 4s ease-in-out infinite;
  transform-origin: center;
}

@keyframes breathe {
  0%   { transform: scale(1);    box-shadow: 0 4px 12px rgba(133,76,101,0.4); }
  50%  { transform: scale(1.05); box-shadow: 0 6px 16px rgba(133,76,101,0.6); }
  100% { transform: scale(1);    box-shadow: 0 4px 12px rgba(133,76,101,0.4); }
}

/* ─── 每日愈见内容 ───────────────────────── */
.daily-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 10px 0 20px;
  cursor: pointer;
  min-height: 0;
}

.daily-entry-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: linear-gradient(135deg,
    rgba(200, 150, 180, 0.15) 0%,
    rgba(133, 76, 101, 0.1) 50%,
    rgba(200, 150, 180, 0.15) 100%
  );
  border: 1px solid rgba(200, 150, 180, 0.3);
  border-radius: 12px;
  padding: 30px 20px 25px;
  overflow: hidden;
  box-shadow:
    0 0 15px rgba(200, 150, 180, 0.2),
    inset 0 0 20px rgba(133, 76, 101, 0.05);
  transition: all 0.3s ease;
}

.daily-content:hover .daily-entry-card {
  border-color: rgba(200, 150, 180, 0.5);
  box-shadow:
    0 0 20px rgba(200, 150, 180, 0.3),
    inset 0 0 25px rgba(133, 76, 101, 0.1);
}

/* 装饰圆圈 */
.daily-entry-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 150, 180, 0.2) 0%, transparent 70%);
}

.circle-1 {
  width: 100px; height: 100px;
  top: -50px; right: -25px;
  animation: pulseDot 4s ease-in-out infinite 0s;
}
.circle-2 {
  width: 75px; height: 75px;
  bottom: -37px; left: -15px;
  animation: pulseDot 4s ease-in-out infinite 1.5s;
}
.circle-3 {
  width: 60px; height: 60px;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: pulseCenter 4s ease-in-out infinite 3s;
}

@keyframes pulseDot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.6; transform: scale(1.1); }
}
@keyframes pulseCenter {
  0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
  50%       { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
}

/* 主内容 */
.daily-entry-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  position: relative;
  z-index: 1;
  padding: 20px 0;
}

.daily-entry-icon {
  font-size: 70px;
  line-height: 1;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(200, 150, 180, 0.5));
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

.daily-entry-text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.daily-entry-title {
  font-size: 20px;
  color: #ffffff;
  letter-spacing: 2px;
  font-weight: 600;
  text-shadow: 0 0 5px rgba(200, 150, 180, 0.5);
}

.daily-entry-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
  text-align: center;
}

/* 底部提示 */
.daily-entry-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid rgba(200, 150, 180, 0.2);
  position: relative;
  z-index: 1;
}

.daily-entry-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.daily-entry-arrow {
  font-size: 16px;
  color: #c896b4;
  animation: slideRight 1.5s ease-in-out infinite;
}

@keyframes slideRight {
  0%, 100% { transform: translateX(0);   opacity: 0.6; }
  50%       { transform: translateX(6px); opacity: 1; }
}
</style>
