<template>
  <div>
    <h2 class="page-title">AI 配置</h2>
    <el-card v-loading="loading" style="max-width: 600px">
      <el-form :model="form" label-width="160px">
        <el-form-item label="AI 服务商">
          <el-radio-group v-model="form.provider">
            <el-radio value="coze">Coze 平台</el-radio>
            <el-radio value="mock">Mock（测试）</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="form.provider === 'coze'">
          <el-form-item label="Coze API Token">
            <el-input
              v-model="form.cozeToken"
              :placeholder="currentMasked ? `当前：${currentMasked}（留空保持不变）` : '输入新 Token'"
              type="password"
              show-password
            />
          </el-form-item>
          <el-form-item label="抽卡 Workflow ID">
            <el-input v-model="form.cardDrawWorkflowId" placeholder="card_draw_workflow_id" />
          </el-form-item>
          <el-form-item label="每日愈见 Workflow ID">
            <el-input v-model="form.dailyInsightWorkflowId" placeholder="daily_insight_workflow_id" />
          </el-form-item>
          <el-form-item label="助学童子 Bot ID">
            <el-input v-model="form.assistantBotId" placeholder="assistant_bot_id" />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          <el-button :loading="testing" @click="handleTest" style="margin-left: 8px">测试连接</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="testResult"
        :title="testResult.ok ? `连接正常，延迟 ${testResult.latencyMs}ms` : '连接失败'"
        :type="testResult.ok ? 'success' : 'error'"
        :closable="true"
        style="margin-top: 12px"
        @close="testResult = null"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiConfigApi } from '@/api/ai-config'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const currentMasked = ref('')
const testResult = ref<{ ok: boolean; latencyMs: number } | null>(null)

const form = reactive({
  provider: 'coze' as 'mock' | 'coze',
  cozeToken: '',
  cardDrawWorkflowId: '',
  dailyInsightWorkflowId: '',
  assistantBotId: '',
})

onMounted(() => loadConfig())

async function loadConfig() {
  loading.value = true
  try {
    const cfg = await aiConfigApi.get()
    form.provider = cfg.provider
    form.cardDrawWorkflowId = cfg.cardDrawWorkflowId ?? ''
    form.dailyInsightWorkflowId = cfg.dailyInsightWorkflowId ?? ''
    form.assistantBotId = cfg.assistantBotId ?? ''
    currentMasked.value = cfg.cozeTokenMasked ?? ''
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      provider: form.provider,
      cardDrawWorkflowId: form.cardDrawWorkflowId || undefined,
      dailyInsightWorkflowId: form.dailyInsightWorkflowId || undefined,
      assistantBotId: form.assistantBotId || undefined,
    }
    if (form.cozeToken.trim()) payload.cozeToken = form.cozeToken
    await aiConfigApi.update(payload)
    ElMessage.success('配置已保存')
    form.cozeToken = ''
    await loadConfig()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleTest() {
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await aiConfigApi.test()
  } catch {
    testResult.value = { ok: false, latencyMs: 0 }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.page-title { margin-bottom: 20px; }
</style>
