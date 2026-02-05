<template>
  <div class="join-lottery">
    <div class="festive-decoration">
      <div class="decoration-item">🧧</div>
      <div class="decoration-item">🎊</div>
      <div class="decoration-item">🎉</div>
      <div class="decoration-item">🧧</div>
      <div class="decoration-item">🎊</div>
    </div>

    <div class="join-card">
      <div class="card-header">
        <h1 class="title">🎁 加入抽奖</h1>
        <div class="subtitle" v-if="currentSession">
          {{ currentSession.name }}
        </div>
        <div class="subtitle" v-else>
          暂无进行中的抽奖
        </div>
      </div>

      <!-- 已有设备ID，已参与 -->
      <div v-if="hasJoined" class="joined-section">
        <div class="success-icon">✅</div>
        <h2>您已成功加入抽奖！</h2>
        <p class="joined-name">姓名：{{ joinedName }}</p>
        <p class="joined-info">请留意大屏幕，祝您好运！</p>
        <el-button type="primary" @click="refreshStatus">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
      </div>

      <!-- 没有进行中的抽奖 -->
      <div v-else-if="!currentSession" class="no-session">
        <el-icon :size="64" color="#DC143C"><WarningFilled /></el-icon>
        <h2>当前没有进行中的抽奖</h2>
        <p>请等待主持人开启新的抽奖活动</p>
        <el-button type="primary" @click="refreshStatus">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <!-- 加入表单 -->
      <div v-else class="join-form">
        <el-form :model="form" label-position="top">
          <el-form-item label="请输入您的姓名">
            <el-input
              v-model="form.name"
              placeholder="请输入姓名"
              size="large"
              maxlength="20"
              show-word-limit
              @keyup.enter="handleJoin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="join-btn"
              @click="handleJoin"
              :loading="loading"
              :disabled="!form.name.trim()"
            >
              <el-icon><CircleCheck /></el-icon>
              确认加入
            </el-button>
          </el-form-item>
        </el-form>

        <div class="tips">
          <p>💡 提示：</p>
          <ul>
            <li>每个设备只能加入一次</li>
            <li>请使用真实姓名以便中奖后确认</li>
            <li>加入后请留意大屏幕抽奖结果</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="footer-nav">
      <el-button type="warning" @click="$router.push('/')">
        <el-icon><HomeFilled /></el-icon>
        返回大屏幕
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useLotteryStore } from '../stores/lottery'
import { lotteryApi } from '../api'

const store = useLotteryStore()

const form = ref({
  name: ''
})

const loading = ref(false)
const currentSession = ref(null)
const hasJoined = ref(false)
const joinedName = ref('')

// 生成或获取设备ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('lottery_device_id')
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('lottery_device_id', deviceId)
  }
  return deviceId
}

// 检查是否已参与
const checkJoinedStatus = async () => {
  try {
    const deviceId = getDeviceId()
    const res = await lotteryApi.getAvailableParticipants()
    
    if (res.success && currentSession.value) {
      // 检查是否已在参与者列表中
      const allParticipantsRes = await lotteryApi.getAvailableParticipants()
      // 这里简化处理，实际应该查询该设备是否已加入
      // 通过错误信息来判断
    }
  } catch (error) {
    console.error('检查状态失败:', error)
  }
}

// 获取当前会话
const fetchCurrentSession = async () => {
  await store.fetchCurrentSession()
  currentSession.value = store.currentSession
}

// 处理加入
const handleJoin = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }

  try {
    loading.value = true
    const deviceId = getDeviceId()
    
    const res = await store.joinLottery(form.value.name.trim(), deviceId)
    
    if (res.success) {
      ElMessage.success(res.message)
      hasJoined.value = true
      joinedName.value = form.value.name.trim()
      localStorage.setItem('lottery_joined_name', form.value.name.trim())
      localStorage.setItem('lottery_joined_session', currentSession.value?.id)
    }
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

// 刷新状态
const refreshStatus = async () => {
  await fetchCurrentSession()
  checkJoinedStatus()
  ElMessage.success('已刷新')
}

onMounted(async () => {
  await fetchCurrentSession()
  
  // 检查本地存储，看是否已加入当前抽奖
  const joinedSession = localStorage.getItem('lottery_joined_session')
  const savedName = localStorage.getItem('lottery_joined_name')
  
  if (joinedSession && savedName && currentSession.value) {
    if (parseInt(joinedSession) === currentSession.value.id) {
      hasJoined.value = true
      joinedName.value = savedName
    }
  }
})
</script>

<style scoped>
.join-lottery {
  min-height: 100vh;
  background: linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #8B0000 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.festive-decoration {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  font-size: 36px;
  animation: bounce 2s infinite;
}

.decoration-item {
  animation: bounce 1s infinite;
}

.decoration-item:nth-child(2) { animation-delay: 0.2s; }
.decoration-item:nth-child(3) { animation-delay: 0.4s; }
.decoration-item:nth-child(4) { animation-delay: 0.6s; }
.decoration-item:nth-child(5) { animation-delay: 0.8s; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.join-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 4px solid #FFD700;
  position: relative;
  z-index: 1;
}

.join-card::before,
.join-card::after {
  content: '🏮';
  position: absolute;
  font-size: 48px;
  top: -30px;
}

.join-card::before {
  left: 30px;
}

.join-card::after {
  right: 30px;
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 32px;
  color: #DC143C;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.join-form {
  margin-top: 20px;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.join-btn {
  width: 100%;
  height: 50px;
  font-size: 18px;
  font-weight: bold;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  color: #8B0000;
  margin-top: 10px;
}

.join-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
}

.tips {
  margin-top: 30px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 12px;
  border-left: 4px solid #FFD700;
}

.tips p {
  font-weight: bold;
  color: #DC143C;
  margin: 0 0 10px 0;
}

.tips ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  font-size: 14px;
}

.tips li {
  margin-bottom: 5px;
}

/* 已加入状态 */
.joined-section {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.joined-section h2 {
  color: #4caf50;
  margin: 0 0 15px 0;
}

.joined-name {
  font-size: 24px;
  font-weight: bold;
  color: #DC143C;
  margin: 0 0 10px 0;
}

.joined-info {
  color: #666;
  margin: 0 0 20px 0;
}

/* 无抽奖状态 */
.no-session {
  text-align: center;
  padding: 20px 0;
}

.no-session h2 {
  color: #DC143C;
  margin: 20px 0 10px 0;
}

.no-session p {
  color: #666;
  margin: 0 0 20px 0;
}

/* 底部导航 */
.footer-nav {
  margin-top: 30px;
}

.footer-nav .el-button {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #FFD700;
  color: #DC143C;
  font-weight: bold;
}

@media (max-width: 480px) {
  .join-card {
    padding: 30px 20px;
  }
  
  .title {
    font-size: 28px;
  }
  
  .festive-decoration {
    font-size: 28px;
  }
  
  .join-card::before,
  .join-card::after {
    font-size: 36px;
    top: -25px;
  }
}
</style>