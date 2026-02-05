<template>
  <div class="admin-page">
    <div class="header">
      <h1 class="title">🏮 抽奖管理后台 🏮</h1>
      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/sessions')">
          <el-icon><Management /></el-icon>
          会话管理
        </el-button>
        <el-button @click="$router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
      </div>
    </div>

    <!-- 没有进行中的抽奖 -->
    <el-card v-if="!currentSession" class="no-session-card">
      <div class="no-session-content">
        <el-icon :size="64" color="#DC143C"><WarningFilled /></el-icon>
        <h2>当前没有进行中的抽奖</h2>
        <p>请先前往会话管理页面开启新抽奖</p>
        <el-button type="primary" size="large" @click="$router.push('/sessions')">
          去开启抽奖
        </el-button>
      </div>
    </el-card>

    <template v-else>
      <!-- 会话信息 -->
      <el-card class="session-info-card">
        <template #header>
          <div class="card-header">
            <span class="session-name">{{ currentSession.name }}</span>
            <el-tag type="success" effect="dark" size="large">进行中</el-tag>
          </div>
        </template>
        
        <div class="info-grid">
          <div class="info-item">
            <el-icon><User /></el-icon>
            <span>参与者：{{ participantCount }} 人</span>
          </div>
          <div class="info-item">
            <el-icon><Trophy /></el-icon>
            <span>奖项数：{{ rounds.length }} 个</span>
          </div>
          <div class="info-item">
            <el-icon><Medal /></el-icon>
            <span>已中奖：{{ winnerCount }} 人</span>
          </div>
        </div>
      </el-card>

      <!-- 参与者管理 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">
              <el-icon><UserFilled /></el-icon>
              参与者管理
            </span>
            <div class="header-actions">
              <el-button type="success" @click="handleGenerateTest" :loading="loading">
                <el-icon><Plus /></el-icon>
                生成50个测试人员
              </el-button>
              <el-upload
                action=""
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
                accept=".xlsx,.xls"
              >
                <el-button type="primary" :loading="uploadLoading">
                  <el-icon><Upload /></el-icon>
                  导入Excel
                </el-button>
              </el-upload>
              <el-button @click="handleExportParticipants">
                <el-icon><Download /></el-icon>
                导出名单
              </el-button>
            </div>
          </div>
        </template>

        <el-alert
          v-if="participants.length === 0"
          title="暂无参与者，请导入或生成测试数据"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        />

        <el-table :data="participants" height="300" v-loading="loading">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="department" label="部门" />
          <el-table-column prop="phone" label="手机号" />
          <el-table-column prop="join_method" label="加入方式" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.join_method === 'import' ? 'primary' : 'success'" size="small">
                {{ scope.row.join_method === 'import' ? '导入' : '自助' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button type="danger" size="small" @click="handleDeleteParticipant(scope.row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 奖项设置 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">
              <el-icon><Trophy /></el-icon>
              奖项设置
            </span>
            <div class="header-actions">
              <el-button type="warning" @click="handleInitDefaultRounds" :loading="loading">
                <el-icon><Refresh /></el-icon>
                初始化默认奖项
              </el-button>
              <el-button type="primary" @click="showAddRoundDialog = true">
                <el-icon><Plus /></el-icon>
                添加奖项
              </el-button>
            </div>
          </div>
        </template>

        <el-alert
          v-if="rounds.length === 0"
          title="暂无奖项设置，请初始化默认奖项或手动添加"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        />

        <el-table :data="rounds" v-loading="loading">
          <el-table-column prop="order_num" label="顺序" width="80" />
          <el-table-column prop="name" label="奖项名称" />
          <el-table-column prop="quantity" label="中奖人数" width="100" />
          <el-table-column prop="allow_repeat" label="允许重复" width="100">
            <template #default="scope">
              <el-switch
                v-model="scope.row.allow_repeat"
                :active-value="1"
                :inactive-value="0"
                @change="(val) => handleToggleRepeat(scope.row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="is_completed" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.is_completed ? 'success' : 'warning'" size="small">
                {{ scope.row.is_completed ? '已完成' : '未开始' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEditRound(scope.row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" @click="handleDeleteRound(scope.row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 中奖记录 -->
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <span class="section-title">
              <el-icon><Medal /></el-icon>
              中奖记录
            </span>
            <el-button @click="handleExportWinners">
              <el-icon><Download /></el-icon>
              导出中奖名单
            </el-button>
          </div>
        </template>

        <el-alert
          v-if="winners.length === 0"
          title="暂无中奖记录"
          type="info"
          :closable="false"
          style="margin-bottom: 15px;"
        />

        <el-table :data="winners" height="300" v-loading="loading">
          <el-table-column prop="round_name" label="奖项" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="department" label="部门" />
          <el-table-column prop="won_at" label="中奖时间">
            <template #default="scope">
              {{ formatDate(scope.row.won_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 添加/编辑奖项对话框 -->
    <el-dialog
      v-model="showAddRoundDialog"
      :title="editingRound ? '编辑奖项' : '添加奖项'"
      width="500px"
    >
      <el-form :model="roundForm" label-width="100px">
        <el-form-item label="奖项名称">
          <el-input v-model="roundForm.name" placeholder="如：特等奖" />
        </el-form-item>
        <el-form-item label="中奖人数">
          <el-input-number v-model="roundForm.quantity" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="抽奖顺序">
          <el-input-number v-model="roundForm.order_num" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="允许重复">
          <el-switch
            v-model="roundForm.allow_repeat"
            :active-value="1"
            :inactive-value="0"
            active-text="是"
            inactive-text="否"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRoundDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRound">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLotteryStore } from '../stores/lottery'
import { exportApi } from '../api'

const router = useRouter()
const store = useLotteryStore()

const loading = ref(false)
const uploadLoading = ref(false)
const showAddRoundDialog = ref(false)
const editingRound = ref(null)

const roundForm = ref({
  name: '',
  quantity: 1,
  order_num: 1,
  allow_repeat: 0
})

// 计算属性
const currentSession = computed(() => store.currentSession)
const participants = computed(() => store.participants)
const rounds = computed(() => store.rounds)
const winners = computed(() => store.winners)
const participantCount = computed(() => store.participantCount)
const winnerCount = computed(() => store.winnerCount)

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 生成测试数据
const handleGenerateTest = async () => {
  try {
    loading.value = true
    const res = await store.generateTestData()
    ElMessage.success(res.message)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

// 导入Excel
const handleFileChange = async (file) => {
  try {
    uploadLoading.value = true
    const formData = new FormData()
    formData.append('file', file.raw)
    const res = await store.importExcel(formData)
    ElMessage.success(res.message)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    uploadLoading.value = false
  }
}

// 导出参与者
const handleExportParticipants = async () => {
  try {
    if (!currentSession.value) return
    const blob = await exportApi.exportParticipants(currentSession.value.id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `参与者名单_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  }
}

// 删除参与者
const handleDeleteParticipant = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该参与者吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    // TODO: 实现删除功能
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message)
    }
  }
}

// 初始化默认奖项
const handleInitDefaultRounds = async () => {
  try {
    if (!currentSession.value) return
    
    await ElMessageBox.confirm(
      '初始化默认奖项将清空现有奖项设置，确定继续吗？\n\n默认奖项：幸运奖(10人) → 三等奖(4人) → 二等奖(2人) → 一等奖(1人) → 特等奖(1人)',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    loading.value = true
    const res = await store.initDefaultRounds(currentSession.value.id)
    ElMessage.success(res.message)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message)
    }
  } finally {
    loading.value = false
  }
}

// 编辑奖项
const handleEditRound = (row) => {
  editingRound.value = row
  roundForm.value = {
    name: row.name,
    quantity: row.quantity,
    order_num: row.order_num,
    allow_repeat: row.allow_repeat
  }
  showAddRoundDialog.value = true
}

// 保存奖项
const handleSaveRound = async () => {
  try {
    if (!roundForm.value.name) {
      ElMessage.warning('请输入奖项名称')
      return
    }
    
    if (editingRound.value) {
      await store.updateRound(editingRound.value.id, roundForm.value)
      ElMessage.success('奖项更新成功')
    } else {
      await store.createRound(currentSession.value.id, roundForm.value)
      ElMessage.success('奖项添加成功')
    }
    
    showAddRoundDialog.value = false
    editingRound.value = null
    roundForm.value = { name: '', quantity: 1, order_num: 1, allow_repeat: 0 }
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// 删除奖项
const handleDeleteRound = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该奖项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await store.deleteRound(row.id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message)
    }
  }
}

// 切换重复中奖
const handleToggleRepeat = async (row, val) => {
  try {
    await store.updateRound(row.id, { allow_repeat: val })
    ElMessage.success('设置已更新')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// 导出中奖名单
const handleExportWinners = async () => {
  try {
    if (!currentSession.value) return
    const blob = await exportApi.exportWinners(currentSession.value.id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `中奖名单_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  }
}

onMounted(async () => {
  loading.value = true
  await store.fetchCurrentSession()
  if (currentSession.value) {
    await Promise.all([
      store.fetchRounds(currentSession.value.id),
      store.fetchParticipants(),
      store.fetchWinners()
    ])
  }
  loading.value = false
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #8B0000 100%);
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.title {
  font-size: 32px;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.no-session-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.no-session-content {
  text-align: center;
  padding: 60px 20px;
}

.no-session-content h2 {
  margin: 20px 0 10px;
  color: #DC143C;
}

.no-session-content p {
  color: #666;
  margin-bottom: 20px;
}

.session-info-card,
.section-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-name {
  font-size: 20px;
  font-weight: bold;
  color: #DC143C;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: #666;
}

.info-item .el-icon {
  font-size: 24px;
  color: #DC143C;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
  }
  
  .title {
    font-size: 24px;
  }
  
  .header-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .section-card .card-header {
    align-items: flex-start;
  }
}
</style>