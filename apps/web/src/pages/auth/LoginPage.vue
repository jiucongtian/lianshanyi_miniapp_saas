<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth.store'
import { useTenantStore } from '@/stores/tenant.store'
import * as authApi from '@/api/auth.api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const tenantStore = useTenantStore()

const activeTab = ref(0)

// Phone login
const phone = ref('')
const smsCode = ref('')
const smsCounting = ref(false)
const smsCountdown = ref(60)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// Password login
const username = ref('')
const password = ref('')

const loading = ref(false)

async function sendSms() {
  if (!phone.value || phone.value.length !== 11) {
    showToast('请输入正确的手机号')
    return
  }
  try {
    await authApi.sendSmsCode(phone.value)
    showToast('验证码已发送')
    smsCounting.value = true
    smsCountdown.value = 60
    countdownTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) {
        smsCounting.value = false
        if (countdownTimer) clearInterval(countdownTimer)
      }
    }, 1000)
  } catch {
    showToast({ type: 'fail', message: '发送失败，请重试' })
  }
}

async function handlePhoneLogin() {
  if (!phone.value || !smsCode.value) {
    showToast('请填写手机号和验证码')
    return
  }
  loading.value = true
  try {
    const result = await authStore.loginSms(phone.value, smsCode.value)
    if (result?.success) {
      showToast({ type: 'success', message: '登录成功' })
      const redirect = (route.query.redirect as string) ?? '/home'
      router.push(redirect)
    } else {
      showToast({ type: 'fail', message: result?.error ?? '登录失败' })
    }
  } catch {
    showToast({ type: 'fail', message: '登录失败，请重试' })
  } finally {
    loading.value = false
  }
}

async function handlePasswordLogin() {
  if (!username.value || !password.value) {
    showToast('请填写账号和密码')
    return
  }
  loading.value = true
  try {
    const result = await authStore.loginPassword(username.value, password.value)
    if (result?.success) {
      showToast({ type: 'success', message: '登录成功' })
      const redirect = (route.query.redirect as string) ?? '/home'
      router.push(redirect)
    } else {
      showToast({ type: 'fail', message: result?.error ?? '登录失败' })
    }
  } catch {
    showToast({ type: 'fail', message: '账号或密码错误' })
  } finally {
    loading.value = false
  }
}

async function handleGuestLogin() {
  loading.value = true
  try {
    const result = await authStore.loginGuest()
    if (result?.success) {
      router.push('/home')
    }
  } catch {
    showToast({ type: 'fail', message: '进入失败，请重试' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page page-container--no-tabbar">
    <div class="login-page__header">
      <div class="login-page__logo">{{ tenantStore.config?.themeConfig.brandName ?? '连山易' }}</div>
      <div class="login-page__subtitle">命理解读 · 卡牌占卜</div>
    </div>

    <div class="login-page__card">
      <van-tabs v-model:active="activeTab" line-width="40px">
        <van-tab title="手机登录">
          <div class="login-form">
            <van-field
              v-model="phone"
              type="tel"
              label="手机号"
              placeholder="请输入手机号"
              maxlength="11"
              clearable
            />
            <van-field
              v-model="smsCode"
              label="验证码"
              placeholder="请输入验证码"
              maxlength="6"
            >
              <template #button>
                <van-button
                  size="small"
                  :disabled="smsCounting"
                  @click="sendSms"
                >
                  {{ smsCounting ? `${smsCountdown}s` : '获取验证码' }}
                </van-button>
              </template>
            </van-field>
            <div class="login-form__actions">
              <van-button
                block
                type="primary"
                :loading="loading"
                round
                @click="handlePhoneLogin"
              >
                登录
              </van-button>
            </div>
          </div>
        </van-tab>

        <van-tab title="密码登录">
          <div class="login-form">
            <van-field
              v-model="username"
              label="账号"
              placeholder="请输入账号/手机号"
              clearable
            />
            <van-field
              v-model="password"
              type="password"
              label="密码"
              placeholder="请输入密码"
            />
            <div class="login-form__actions">
              <van-button
                block
                type="primary"
                :loading="loading"
                round
                @click="handlePasswordLogin"
              >
                登录
              </van-button>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <div class="login-page__footer">
      <van-button
        text
        class="login-page__guest-btn"
        @click="handleGuestLogin"
      >
        游客浏览 &gt;
      </van-button>
      <div class="login-page__register">
        没有账号？
        <router-link to="/register" class="login-page__link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #fff8f0 0%, #fdebd0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.login-page__header {
  padding: 72px 0 40px;
  text-align: center;
}

.login-page__logo {
  font-size: 42px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 6px;
  text-shadow: 0 2px 8px rgba(139, 69, 19, 0.15);
}

.login-page__subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 2px;
}

.login-page__card {
  width: 100%;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.1);
}

.login-form {
  padding: 20px 0 8px;
}

.login-form__actions {
  padding: 20px 16px 12px;
}

.login-page__footer {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.login-page__guest-btn {
  color: var(--color-primary) !important;
  font-size: 15px;
}

.login-page__register {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.login-page__link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}
</style>
