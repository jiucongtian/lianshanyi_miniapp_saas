<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" icon="Plus" @click="showCreate = true">新建用户</el-button>
    </div>

    <!-- Filters -->
    <el-card class="filter-card">
      <el-form inline>
        <el-form-item label="租户">
          <el-select v-model="filter.tenantId" placeholder="全部租户" clearable style="width: 180px" @change="onFilter">
            <el-option v-for="a in accounts" :key="a._id" :label="`${a.name}（${a.slug}）`" :value="a._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户类型">
          <el-select v-model="filter.userType" placeholder="全部" clearable style="width: 110px" @change="onFilter">
            <el-option label="访客" value="guest" />
            <el-option label="普通" value="normal" />
            <el-option label="学生" value="student" />
            <el-option label="高级" value="premium" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="filter.search" placeholder="用户名 / 手机号 / 昵称" clearable style="width: 200px" @change="onFilter" />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="users" v-loading="loading" border stripe>
        <el-table-column label="用户名" min-width="110">
          <template #default="{ row }">{{ row.username ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="昵称" min-width="100">
          <template #default="{ row }">{{ row.nickname ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.phone ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="租户" width="150">
          <template #default="{ row }">
            <template v-if="row.tenantId && typeof row.tenantId === 'object'">
              <div>{{ row.tenantId.name }}</div>
              <el-text size="small" type="info">{{ row.tenantId.slug }}</el-text>
            </template>
            <template v-else>{{ row.tenantId }}</template>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <el-select v-model="row.userType" size="small" @change="(v: string) => updateType(row._id, v)">
              <el-option label="访客" value="guest" />
              <el-option label="普通" value="normal" />
              <el-option label="学生" value="student" />
              <el-option label="高级" value="premium" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="160">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '—' }}</template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        :page-size="20"
        :total="total"
        @current-change="load"
        layout="total, prev, pager, next"
      />
    </el-card>

    <!-- Create dialog -->
    <el-dialog v-model="showCreate" title="新建用户" width="480px">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="所属租户" required>
          <el-select v-model="createForm.tenantId" placeholder="选择租户" style="width: 100%">
            <el-option v-for="a in accounts" :key="a._id" :label="`${a.name}（${a.slug}）`" :value="a._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="createForm.phone" placeholder="可选" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" placeholder="至少 6 位" show-password />
        </el-form-item>
        <el-form-item label="用户类型">
          <el-select v-model="createForm.userType" style="width: 100%">
            <el-option label="普通" value="normal" />
            <el-option label="学生" value="student" />
            <el-option label="高级" value="premium" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usersApi, type AdminUser } from '@/api/users'
import { accountsApi, type Account } from '@/api/accounts'

const users = ref<AdminUser[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)

const filter = reactive({ tenantId: '', userType: '', search: '' })
const accounts = ref<Account[]>([])

const showCreate = ref(false)
const creating = ref(false)
const createForm = reactive({ tenantId: '', username: '', phone: '', password: '', userType: 'normal' as AdminUser['userType'] })

onMounted(async () => {
  const res = await accountsApi.list({ limit: 100 })
  accounts.value = res.accounts
  await load()
})

function onFilter() {
  page.value = 1
  load()
}

function resetFilter() {
  Object.assign(filter, { tenantId: '', userType: '', search: '' })
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, limit: 20 }
    if (filter.search) params.search = filter.search
    if (filter.tenantId) params.tenantId = filter.tenantId
    if (filter.userType) params.userType = filter.userType
const res = await usersApi.list(params)
    users.value = res.users
    total.value = res.meta.total
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.tenantId) { ElMessage.warning('请选择租户'); return }
  if (!createForm.username.trim()) { ElMessage.warning('请输入用户名'); return }
  if (createForm.password.length < 6) { ElMessage.warning('密码至少 6 位'); return }
  creating.value = true
  try {
    await usersApi.create({
      tenantId: createForm.tenantId,
      username: createForm.username,
      phone: createForm.phone || undefined,
      password: createForm.password,
      userType: createForm.userType,
    })
    ElMessage.success('用户创建成功')
    showCreate.value = false
    Object.assign(createForm, { tenantId: '', username: '', phone: '', password: '', userType: 'normal' })
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function handleDelete(row: AdminUser) {
  const name = row.username ?? row.phone ?? row._id
  await ElMessageBox.confirm(`确认删除用户「${name}」？`, '确认删除', { type: 'warning', confirmButtonText: '确认删除', confirmButtonClass: 'el-button--danger' })
  try {
    await usersApi.delete(row._id)
    ElMessage.success('已删除')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function updateType(userId: string, userType: string) {
  try {
    await usersApi.updateType(userId, userType as AdminUser['userType'])
    ElMessage.success('用户类型已更新')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
    await load()
  }
}

function formatDate(d: string) { return new Date(d).toLocaleString('zh-CN', { hour12: false }) }
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; }
.filter-card { margin-bottom: 16px; }
.filter-card .el-form { margin-bottom: -18px; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
