<template>
  <div class="feedback-page">
    <van-nav-bar title="意见反馈" left-arrow @click-left="router.back()" />

    <div class="form-container">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.content"
            name="content"
            label="反馈内容"
            type="textarea"
            rows="5"
            placeholder="请详细描述您遇到的问题或建议..."
            maxlength="500"
            show-word-limit
            :rules="[{ required: true, message: '请填写反馈内容' }, { min: 5, message: '内容至少5个字' }]"
          />

          <van-field name="category" label="类型">
            <template #input>
              <van-radio-group v-model="form.category" direction="horizontal">
                <van-radio name="功能建议">功能建议</van-radio>
                <van-radio name="问题反馈" style="margin-left: 8px">问题反馈</van-radio>
                <van-radio name="其他" style="margin-left: 8px">其他</van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field
            v-model="form.contactInfo"
            name="contactInfo"
            label="联系方式"
            placeholder="手机号或邮箱（选填）"
          />
        </van-cell-group>

        <div class="submit-area">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            提交反馈
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAppToast, extractApiError } from '@/composables/useToast'
import * as feedbackApi from '@/api/feedback.api'

const router = useRouter()
const { success, fail } = useAppToast()

const loading = ref(false)

const form = reactive({
  content: '',
  category: '功能建议',
  contactInfo: '',
})

async function onSubmit() {
  loading.value = true
  try {
    await feedbackApi.submitFeedback({
      content: form.content,
      category: form.category,
      contactInfo: form.contactInfo || undefined,
    })
    success('感谢您的反馈！')
    router.back()
  } catch (err) {
    fail(extractApiError(err))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.feedback-page { background: var(--color-bg); min-height: 100vh; }
.form-container { padding: 16px; }
.submit-area { margin-top: 24px; }
</style>
