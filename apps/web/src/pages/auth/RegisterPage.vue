<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth.store'
import { register } from '@/api/auth.api'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!username.value || !password.value) {
    showToast('请填写账号和密码')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次密码不一致')
    return
  }
  if (password.value.length < 6) {
    showToast('密码至少6位')
    return
  }
  loading.value = true
  try {
    const res = await register(username.value, password.value, phone.value || undefined)
    if (res.data?.success) {
      const token = res.data.data?.accessToken
      if (token) {
        localStorage.setItem('accessToken', token)
        await authStore.fetchMe()
      }
      showToast({ type: 'success', message: '注册成功' })
      router.push('/home')
    } else {
      showToast({ type: 'fail', message: res.data?.error ?? '注册失败' })
    }
  } catch {
    showToast({ type: 'fail', message: '注册失败，请重试' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page page-container--no-tabbar">
    <van-nav-bar
      title="注册账号"
      left-arrow
      @click-left="$router.back()"
    />
    <div class="register-page__form">
      <van-cell-group inset>
        <van-field
          v-model="username"
          label="账号"
          placeholder="请输入账号（字母数字）"
          clearable
        />
        <van-field
          v-model="phone"
          type="tel"
          label="手机号"
          placeholder="可选，用于登录找回"
          clearable
          maxlength="11"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="至少6位密码"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再次输入密码"
        />
      </van-cell-group>

      <div class="register-page__actions">
        <van-button
          block
          type="primary"
          :loading="loading"
          round
          @click="handleRegister"
        >
          立即注册
        </van-button>
        <div class="register-page__login-link">
          已有账号？
          <router-link to="/login" class="register-page__link">去登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  background: var(--color-bg);
}

.register-page__form {
  padding: 24px 0;
}

.register-page__actions {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.register-page__login-link {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.register-page__link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
}
</style>
