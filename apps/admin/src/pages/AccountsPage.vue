<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">租户管理</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <el-input v-model="search" placeholder="搜索租户名" style="width: 200px" clearable @change="load" />
        <el-button type="primary" icon="Plus" @click="showCreate = true">新建租户</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="accounts" v-loading="loading" border stripe>
        <el-table-column label="名称" prop="name" />
        <el-table-column label="Slug" prop="slug" width="150" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag>{{ row.type === 'tenant' ? '租户' : '合作方' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="套餐" width="90">
          <template #default="{ row }">
            <el-tag type="info">{{ planLabel(row.plan) }}</el-tag>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination class="pagination" v-model:current-page="page" :page-size="20" :total="total" @current-change="load" layout="total, prev, pager, next" />
    </el-card>

    <!-- Create dialog -->
    <el-dialog v-model="showCreate" title="新建租户" width="500px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="名称" required>
          <el-input v-model="createForm.name" placeholder="如：测试租户" />
        </el-form-item>
        <el-form-item label="Slug" required>
          <el-input v-model="createForm.slug" placeholder="小写字母、数字、连字符，如：test-tenant" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="租户" value="tenant" />
            <el-option label="合作方" value="partner" />
          </el-select>
        </el-form-item>
        <el-form-item label="套餐">
          <el-select v-model="createForm.plan" style="width: 100%">
            <el-option label="试用" value="trial" />
            <el-option label="基础版" value="basic" />
            <el-option label="专业版" value="pro" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户上限">
          <el-input-number v-model="createForm.maxUsers" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- Edit dialog -->
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { accountsApi, type Account } from '@/api/accounts'

const accounts = ref<Account[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const search = ref('')

const showCreate = ref(false)
const creating = ref(false)
const createForm = reactive({ name: '', slug: '', type: 'tenant' as 'tenant' | 'partner', plan: 'trial' as 'trial' | 'basic' | 'pro', maxUsers: 100 })

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

async function handleCreate() {
  if (!createForm.name.trim()) { ElMessage.warning('请输入名称'); return }
  if (!createForm.slug.trim()) { ElMessage.warning('请输入 Slug'); return }
  creating.value = true
  try {
    await accountsApi.create({
      name: createForm.name,
      slug: createForm.slug,
      type: createForm.type,
      plan: createForm.plan,
      limits: { maxUsers: createForm.maxUsers },
    })
    ElMessage.success('租户创建成功')
    showCreate.value = false
    Object.assign(createForm, { name: '', slug: '', type: 'tenant', plan: 'trial', maxUsers: 100 })
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
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

async function handleDelete(row: Account) {
  await ElMessageBox.confirm(`确认删除租户「${row.name}」？此操作不可恢复。`, '确认删除', { type: 'warning', confirmButtonText: '确认删除', confirmButtonClass: 'el-button--danger' })
  try {
    await accountsApi.delete(row._id)
    ElMessage.success('已删除')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

function planLabel(p: string) {
  return { trial: '试用', basic: '基础版', pro: '专业版' }[p] ?? p
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
