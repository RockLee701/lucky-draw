<template>
  <div class="session-manage">
    <div class="header">
      <h1 class="title">🏮 抽奖会话管理 🏮</h1>
      <el-button type="warning" @click="$router.push('/')">
        <el-icon><HomeFilled /></el-icon>
        返回首页
      </el-button>
    </div>

    <el-card class="current-session-card" v-if="currentSession">
      <template #header>
        <div class="card-header">
          <span class="session-title">当前抽奖：{{ currentSession.name }}</span>
          <el-tag :type="currentSession.status === 'ongoing' ? 'success' : 'info'" effect="dark" size="large">
            {{ currentSession.status === 'ongoing' ? '进行中' : '已结束' }}
          </el-tag>
        </div>
      </template>
      
      <div class="session-stats">
        <div class="stat-item">
          <div class="stat-value">{{ currentSession.participantCount || 0 }}</div>
          <div class="stat-label">参与者</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ currentSession.winnerCount || 0 }}</div>
          <div class="stat-label">已中奖</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ currentSession.roundCount || 0 }}</div>
          <div class="stat-label">奖项数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ currentSession.completedRounds || 0 }}/{{ currentSession.roundCount || 0 }}</div>
          <div class="stat-label">完成轮次</div>
        </div>
      </div>

      <div class="session-actions">
        <el-button type="primary" @click="$router.push('/admin')">
          <el-icon><Setting /></el-icon>
          管理设置
        </el-button>
        <el-button type="danger" @click="handleCloseSession">
          <el-icon><CircleCloseFilled /></el-icon>
          结束本次抽奖
        </el-button>
      </div>
    </el-card>

    <el-card class="create-session-card" v-else>
      <template #header>
        <div class="card-header">
          <span>开启新抽奖</span>
        </div>
      </template>
      
      <el-form :model="form" label-width="100px">
        <el-form-item label="抽奖名称">
          <el-input 
            v-model="form.name" 
            placeholder="请输入抽奖名称，如：2024年会抽奖"
            size="large"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            @click="handleCreateSession"
            :disabled="!form.name"
            class="create-btn"
          >
            <el-icon><Plus /></el-icon>
            开启新抽奖
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>历史抽奖记录</span>
        </div>
      </template>
      
      <el-table :data="sessions" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="抽奖名称" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'ongoing' ? 'success' : 'info'">
              {{ scope.row.status === 'ongoing' ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleExport(scope.row.id)"
              v-if="scope.row.status === 'completed'"
            >
              导出结果
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLotteryStore } from '../stores/lottery'
import { sessionApi, exportApi } from '../api'

const router = useRouter()
const store = useLotteryStore()

const form = ref({
  name: ''
})

const sessions = ref([])
const loading = ref(false)
const currentSession = ref(null)

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 获取所有会话
const fetchSessions = async () => {
  loading.value = true
  try {
    const res = await sessionApi.getAll()
    if (res.success) {
      sessions.value = res.data
    }
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

// 获取当前会话
const fetchCurrentSession = async () => {
  const res = await sessionApi.getCurrent()
  if (res.success) {
    currentSession.value = res.data
  }
}

// 创建会话
const handleCreateSession = async () => {
  try {
    await store.createSession(form.value.name)
    ElMessage.success('抽奖会话创建成功')
    form.value.name = ''
    await fetchCurrentSession()
    await fetchSessions()
    router.push('/admin')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

// 关闭会话
const handleCloseSession = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束本次抽奖吗？结束后将无法继续抽奖！',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await store.closeSession(currentSession.value.id)
    ElMessage.success('抽奖会话已关闭')
    currentSession.value = null
    await fetchSessions()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message)
    }
  }
}

// 导出结果
const handleExport = async (sessionId) => {
  try {
    const blob = await exportApi.exportWinners(sessionId)
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

onMounted(() => {
  fetchCurrentSession()
  fetchSessions()
})
</script>

<style scoped>
.session-manage {
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

.current-session-card,
.create-session-card,
.history-card {
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

.session-title {
  font-size: 20px;
  font-weight: bold;
  color: #DC143C;
}

.session-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin: 20px 0;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: linear-gradient(135deg, #FFF8DC 0%, #FFFACD 100%);
  border-radius: 12px;
  border: 2px solid #FFD700;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #DC143C;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.session-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.create-btn {
  width: 100%;
  height: 50px;
  font-size: 18px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  color: #8B0000;
  font-weight: bold;
}

.create-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
}

@media (max-width: 768px) {
  .session-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .title {
    font-size: 24px;
  }
  
  .session-actions {
    flex-direction: column;
  }
}
</style>