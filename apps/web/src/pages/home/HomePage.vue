<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const currentTab = ref<'wisdom' | 'daily'>('wisdom')
const question = ref('')

onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.isGuest) {
    if (!authStore.user) await authStore.fetchMe()
    await profileStore.fetchProfiles()
  }
})

function onFindAnswer() {
  const q = question.value.trim()
  router.push(q ? `/answer?question=${encodeURIComponent(q)}` : '/answer')
}

const exampleQuestions = [
  '我的事业何时会有突破？',
  '感情路上是否顺遂？',
  '今年财运如何？',
  '我适合做哪方面的工作？',
  '家庭关系如何改善？',
  '当下最该关注什么？',
]
</script>

<template>
  <div class="home-page page-container">
    <!-- Tab navigation -->
    <div class="home-page__tabs">
      <div
        class="home-page__tab"
        :class="{ 'home-page__tab--active': currentTab === 'wisdom' }"
        @click="currentTab = 'wisdom'"
      >智慧洞见</div>
      <div
        class="home-page__tab"
        :class="{ 'home-page__tab--active': currentTab === 'daily' }"
        @click="currentTab = 'daily'"
      >每日愈见</div>
    </div>

    <!-- 智慧洞见 -->
    <div v-show="currentTab === 'wisdom'" class="home-page__content">
      <div class="home-page__card-title">
        <div class="home-page__title-main">智慧洞见</div>
        <div class="home-page__title-sub">Wisdom and Insight</div>
      </div>

      <!-- Mandala animation -->
      <div class="mandala-container">
        <div class="mandala">
          <div class="ring ring--outer-1"></div>
          <div class="ring ring--outer-2"></div>
          <div class="ring ring--middle"></div>
          <div class="ring ring--inner">
            <span class="ring__star">✦</span>
          </div>
        </div>
      </div>

      <div class="home-page__instruction">心中默念，思考你的问题：</div>

      <!-- Scrolling example questions -->
      <div class="home-page__examples">
        <div class="home-page__examples-track">
          <div
            v-for="(q, i) in [...exampleQuestions, ...exampleQuestions]"
            :key="i"
            class="home-page__example-item"
          >{{ q }}</div>
        </div>
      </div>

      <div class="home-page__prompt">智慧洞见之门已打开，你准备好提问了吗？</div>

      <div class="home-page__input-wrap">
        <input
          v-model="question"
          class="home-page__input"
          placeholder="说出你的问题，实在没有空着也行！"
          maxlength="50"
          @keyup.enter="onFindAnswer"
        />
      </div>

      <div class="home-page__btn-wrap">
        <van-button type="primary" block round size="large" @click="onFindAnswer">
          抽卡寻找答案
        </van-button>
      </div>
    </div>

    <!-- 每日愈见 -->
    <div v-show="currentTab === 'daily'" class="home-page__content">
      <div class="home-page__card-title">
        <div class="home-page__title-main">每日愈见</div>
        <div class="home-page__title-sub">Daily Healing</div>
      </div>

      <div class="daily-entry" @click="router.push('/daily-insight')">
        <div class="daily-entry__decoration">
          <div class="deco-circle deco-circle--1"></div>
          <div class="deco-circle deco-circle--2"></div>
          <div class="deco-circle deco-circle--3"></div>
        </div>
        <div class="daily-entry__body">
          <div class="daily-entry__icon">🌸</div>
          <div class="daily-entry__text">
            <div class="daily-entry__title">今日治愈</div>
            <div class="daily-entry__subtitle">获取今日的治愈与启发</div>
          </div>
        </div>
        <div class="daily-entry__footer">
          <span class="daily-entry__hint">点击进入</span>
          <span class="daily-entry__arrow">→</span>
        </div>
      </div>
    </div>

    <!-- Background star trails -->
    <div class="home-page__bg" aria-hidden="true">
      <div v-for="i in 8" :key="i" :class="`star-trail star-trail--${i}`"></div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  background: linear-gradient(160deg, #1a0a00 0%, #3d1a00 40%, #6b3412 100%);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding-bottom: 80px;
}

/* ─── Tabs ─────────────────────────────── */
.home-page__tabs {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 24px 0 0;
  position: relative;
  z-index: 2;
}

.home-page__tab {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 220, 170, 0.5);
  padding-bottom: 6px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.25s, border-color 0.25s;
  letter-spacing: 1px;
}

.home-page__tab--active {
  color: #ffd27a;
  border-bottom-color: #ffd27a;
}

/* ─── Content wrapper ───────────────────── */
.home-page__content {
  position: relative;
  z-index: 2;
  padding: 0 20px;
}

/* ─── Card title ─────────────────────────── */
.home-page__card-title {
  text-align: center;
  padding: 20px 0 8px;
}

.home-page__title-main {
  font-size: 22px;
  font-weight: 700;
  color: #ffd27a;
  letter-spacing: 3px;
}

.home-page__title-sub {
  font-size: 12px;
  color: rgba(255, 210, 122, 0.5);
  margin-top: 4px;
  letter-spacing: 2px;
}

/* ─── Mandala ─────────────────────────────── */
.mandala-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 210px;
  margin: 4px 0;
}

.mandala {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
}

.ring--outer-1 {
  width: 180px;
  height: 180px;
  border-width: 2px;
  border-color: rgba(255, 210, 122, 0.35);
  animation: rotate-cw 20s linear infinite;
}

.ring--outer-2 {
  width: 140px;
  height: 140px;
  border-width: 1.5px;
  border-color: rgba(255, 210, 122, 0.25);
  border-style: dashed;
  animation: rotate-ccw 15s linear infinite;
}

.ring--middle {
  width: 100px;
  height: 100px;
  border-width: 2px;
  border-color: rgba(255, 180, 80, 0.45);
  animation: rotate-cw 10s linear infinite;
}

.ring--inner {
  width: 56px;
  height: 56px;
  border-width: 2px;
  border-color: rgba(255, 210, 122, 0.7);
  background: radial-gradient(circle, rgba(139, 69, 19, 0.5) 0%, rgba(80, 30, 0, 0.6) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring__star {
  font-size: 22px;
  color: #ffd27a;
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes rotate-cw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes rotate-ccw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.15); }
}

/* ─── Instruction & prompt ────────────────── */
.home-page__instruction {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 220, 170, 0.75);
  margin-bottom: 10px;
}

.home-page__prompt {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 210, 122, 0.5);
  margin: 10px 0 16px;
}

/* ─── Scrolling examples ──────────────────── */
.home-page__examples {
  overflow: hidden;
  width: calc(100% + 40px);
  margin-left: -20px;
  margin-bottom: 4px;
}

.home-page__examples-track {
  display: flex;
  gap: 10px;
  padding: 6px 20px;
  animation: scroll-x 22s linear infinite;
  width: max-content;
}

.home-page__example-item {
  flex-shrink: 0;
  background: rgba(255, 210, 122, 0.08);
  border: 1px solid rgba(255, 210, 122, 0.2);
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 13px;
  color: rgba(255, 220, 170, 0.8);
  white-space: nowrap;
}

@keyframes scroll-x {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ─── Input ───────────────────────────────── */
.home-page__input-wrap {
  margin: 0 0 16px;
}

.home-page__input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 210, 122, 0.3);
  border-radius: 24px;
  padding: 13px 20px;
  font-size: 14px;
  color: #ffeedd;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.home-page__input::placeholder {
  color: rgba(255, 220, 170, 0.38);
}

.home-page__input:focus {
  border-color: rgba(255, 210, 122, 0.65);
  background: rgba(255, 255, 255, 0.12);
}

/* ─── Button ──────────────────────────────── */
.home-page__btn-wrap {
  padding-bottom: 24px;
}

.home-page__btn-wrap :deep(.van-button--primary) {
  background: linear-gradient(135deg, #b86b1e 0%, #e89c40 100%);
  border: none;
  font-size: 16px;
  letter-spacing: 2px;
  height: 50px;
  box-shadow: 0 4px 18px rgba(184, 107, 30, 0.5);
}

/* ─── Daily entry card ───────────────────── */
.daily-entry {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 210, 122, 0.18);
  border-radius: 20px;
  padding: 20px;
  margin-top: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background 0.2s, transform 0.15s;
}

.daily-entry:active {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(0.98);
}

.daily-entry__decoration {
  position: absolute;
  top: -30px;
  right: -30px;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 210, 122, 0.12);
}

.deco-circle--1 { width: 80px;  height: 80px;  top: 0;    right: 0; }
.deco-circle--2 { width: 130px; height: 130px; top: -25px; right: -25px; }
.deco-circle--3 { width: 180px; height: 180px; top: -50px; right: -50px; }

.daily-entry__body {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.daily-entry__icon { font-size: 38px; flex-shrink: 0; }

.daily-entry__title {
  font-size: 18px;
  font-weight: 700;
  color: #ffd27a;
  margin-bottom: 4px;
}

.daily-entry__subtitle {
  font-size: 13px;
  color: rgba(255, 220, 170, 0.6);
}

.daily-entry__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  border-top: 1px solid rgba(255, 210, 122, 0.1);
  padding-top: 12px;
}

.daily-entry__hint {
  font-size: 13px;
  color: rgba(255, 210, 122, 0.55);
}

.daily-entry__arrow {
  color: #ffd27a;
  font-size: 16px;
}

/* ─── Star trail backgrounds ─────────────── */
.home-page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.star-trail {
  position: absolute;
  width: 1px;
  border-radius: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255, 210, 122, 0.25), transparent);
  animation: trail-fall linear infinite;
  opacity: 0;
}

.star-trail--1  { height: 60px;  left: 8%;   animation-duration: 7s;   animation-delay: 0s; }
.star-trail--2  { height: 40px;  left: 22%;  animation-duration: 9s;   animation-delay: 1.5s; }
.star-trail--3  { height: 80px;  left: 38%;  animation-duration: 5.5s; animation-delay: 3.2s; }
.star-trail--4  { height: 50px;  left: 52%;  animation-duration: 8s;   animation-delay: 0.8s; }
.star-trail--5  { height: 70px;  left: 68%;  animation-duration: 6.5s; animation-delay: 2.1s; }
.star-trail--6  { height: 45px;  left: 82%;  animation-duration: 10s;  animation-delay: 4.3s; }
.star-trail--7  { height: 55px;  left: 3%;   animation-duration: 7.5s; animation-delay: 2.8s; }
.star-trail--8  { height: 65px;  left: 93%;  animation-duration: 6s;   animation-delay: 1.2s; }

@keyframes trail-fall {
  0%   { top: -8%;  opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.8; }
  100% { top: 108%; opacity: 0; }
}
</style>
