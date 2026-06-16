<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">租户管理</h2>
      <el-input v-model="search" placeholder="搜索租户名" style="width: 200px" clearable @change="load" />
    </div>

    <el-card>
      <el-table :data="accounts" v-loading="loading" border stripe>
        <el-table-column label="名称" prop="name" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户上限" width="100">
          <template #default="{ row }">{{ row.limits?.maxUsers ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="AI 调用/天" width="110">
          <template #default="{ row }">{{ row.limits?.aiCallsPerDay ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" v-model:current-page="page" :page-size="20" :total="total" @current-change="load" layout="total, prev, pager, next" />
    </el-card>

    <el-dialog v-model="showEdit" title="编辑租户" width="500px">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="状态">
          <el-select v-model="editForm.status">
            <el-option label="试用" value="trial" />
            <el-option label="正常" value="active" />
            <el-option label="暂停" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户上限">
          <el-input-number v-model="editForm.maxUsers" :min="0" />
        </el-form-item>
        <el-form-item label="AI 调用/天上限">
          <el-input-number v-model="editForm.aiCallsPerDay" :min="0" />
        </el-form-item>
        <el-form-item label="IP 白名单">
          <el-input v-model="editForm.ipWhitelist" placeholder="多个 IP 用逗号分隔，留空不限" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { accountsApi, type Account } from '@/api/accounts'

const accounts = ref<Account[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const search = ref('')

const showEdit = ref(false)
const saving = ref(false)
const editForm = reactive({ id: '', status: 'active' as Account['status'], maxUsers: 100, aiCallsPerDay: 1000, ipWhitelist: '' })

onMounted(() => load())

async function load() {
  loading.value = true
  try {
    const res = await accountsApi.list({ page: page.value, limit: 20, search: search.value || undefined })
    accounts.value = res.accounts
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

function openEdit(row: Account) {
  Object.assign(editForm, {
    id: row._id,
    status: row.status,
    maxUsers: row.limits?.maxUsers ?? 100,
    aiCallsPerDay: row.limits?.aiCallsPerDay ?? 1000,
    ipWhitelist: (row.ipWhitelist ?? []).join(', '),
  })
  showEdit.value = true
}

async function handleEdit() {
  saving.value = true
  try {
    const ips = editForm.ipWhitelist.split(',').map(s => s.trim()).filter(Boolean)
    await accountsApi.update(editForm.id, {
      status: editForm.status,
      limits: { maxUsers: editForm.maxUsers, aiCallsPerDay: editForm.aiCallsPerDay },
      ipWhitelist: ips,
    })
    ElMessage.success('保存成功')
    showEdit.value = false
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function statusLabel(s: string) {
  return { trial: '试用', active: '正常', suspended: '暂停' }[s] ?? s
}
function statusType(s: string): 'success' | 'warning' | 'danger' | 'info' {
  return ({ trial: 'warning', active: 'success', suspended: 'danger' } as Record<string, 'success' | 'warning' | 'danger' | 'info'>)[s] ?? 'info'
}
function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
