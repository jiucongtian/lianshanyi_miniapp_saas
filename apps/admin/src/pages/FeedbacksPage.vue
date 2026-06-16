<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">反馈管理</h2>
      <el-radio-group v-model="statusFilter" @change="load">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="pending">待处理</el-radio-button>
        <el-radio-button value="reviewed">已处理</el-radio-button>
      </el-radio-group>
    </div>

    <el-card>
      <el-table :data="feedbacks" v-loading="loading" border stripe>
        <el-table-column label="内容" prop="content" />
        <el-table-column label="租户 ID" prop="tenantId" width="180" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'reviewed' ? 'success' : 'warning'">
              {{ row.status === 'reviewed' ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回复" prop="reply" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="primary" @click="openReview(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" v-model:current-page="page" :page-size="20" :total="total" @current-change="load" layout="total, prev, pager, next" />
    </el-card>

    <el-dialog v-model="showReview" title="处理反馈" width="480px">
      <p><strong>内容：</strong>{{ currentFb?.content }}</p>
      <el-input v-model="replyText" type="textarea" :rows="3" placeholder="回复内容（可选）" style="margin-top: 12px" />
      <template #footer>
        <el-button @click="showReview = false">取消</el-button>
        <el-button type="primary" :loading="reviewing" @click="handleReview">标记已处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { feedbacksApi, type Feedback } from '@/api/feedbacks'

const feedbacks = ref<Feedback[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const statusFilter = ref('')

const showReview = ref(false)
const reviewing = ref(false)
const replyText = ref('')
const currentFb = ref<Feedback | null>(null)

onMounted(() => load())

async function load() {
  loading.value = true
  try {
    const res = await feedbacksApi.list({ page: page.value, limit: 20, status: statusFilter.value || undefined })
    feedbacks.value = res.feedbacks
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

function openReview(fb: Feedback) {
  currentFb.value = fb
  replyText.value = ''
  showReview.value = true
}

async function handleReview() {
  if (!currentFb.value) return
  reviewing.value = true
  try {
    await feedbacksApi.review(currentFb.value.tenantId, currentFb.value._id, replyText.value)
    ElMessage.success('已处理')
    showReview.value = false
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    reviewing.value = false
  }
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
