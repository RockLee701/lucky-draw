<template>
  <div class="big-screen">
    <!-- 顶部标题 -->
    <div class="header">
      <div class="lantern left">🏮</div>
      <h1 class="main-title">{{ currentSession?.name || '年会抽奖' }}</h1>
      <div class="lantern right">🏮</div>
    </div>

    <!-- 主要内容区 -->
    <div class="main-content">
      <!-- 左侧：中奖名单 -->
      <div class="winners-section">
        <div class="section-title">🏆 中奖名单</div>
        <div class="winners-list" v-if="winners.length > 0">
          <div 
            v-for="winner in winners.slice(0, 20)" 
            :key="winner.id"
            class="winner-item"
          >
            <span class="winner-prize">{{ winner.round_name }}</span>
            <span class="winner-name">{{ winner.name }}</span>
            <span class="winner-dept">{{ winner.department }}</span>
          </div>
        </div>
        <div v-else class="no-winners">
          暂无中奖记录
        </div>
      </div>

      <!-- 中间：抽奖区 -->
      <div class="lottery-section">
        <!-- 二维码 -->
        <div class="qrcode-area" v-if="!isDrawing">
          <div class="qrcode-title">扫码参与抽奖</div>
          <img v-if="qrCode" :src="qrCode" alt="二维码" class="qrcode-img" />
          <div v-else class="qrcode-loading">
            <el-icon :size="40" class="is-loading"><Loading /></el-icon>
            <p>加载中...</p>
          </div>
          <div class="participant-count">
            已有 <span class="count">{{ participantCount }}</span> 人参与
          </div>
        </div>

        <!-- 抽奖动画区 -->
        <div class="drawing-area" v-else>
          <div class="drawing-prize">{{ currentRound?.name }}</div>
          <div class="drawing-name" :class="{ 'rolling': isRolling }">{{ rollingName || '开始抽奖' }}</div>
          <div class="drawing-count">
            抽取 {{ currentRound?.quantity - (currentRound?.winners_count || 0) }} 人
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-area" v-if="currentRound && !currentRound.is_completed">
          <el-button
            v-if="!isDrawing"
            type="primary"
            size="large"
            class="start-btn"
            @click="startDraw"
            :disabled="participantCount === 0"
          >
            <el-icon><VideoPlay /></el-icon>
            开始抽奖
          </el-button>
          <el-button
            v-else
            type="danger"
            size="large"
            class="stop-btn"
            @click="stopDraw"
          >
            <el-icon><CircleCheck /></el-icon>
            停止抽奖
          </el-button>
        </div>
        <div class="control-area" v-else-if="!currentRound">
          <div class="all-complete">🎉 所有奖项已抽取完毕 🎉</div>
        </div>
      </div>

      <!-- 右侧：奖项进度 -->
      <div class="rounds-section">
        <div class="section-title">📋 奖项进度</div>
        <div class="rounds-list">
          <div 
            v-for="round in rounds" 
            :key="round.id"
            class="round-item"
            :class="{ 'active': currentRound?.id === round.id, 'completed': round.is_completed }"
          >
            <div class="round-info">
              <span class="round-name">{{ round.name }}</span>
              <span class="round-quantity">{{ round.quantity }}人</span>
            </div>
            <div class="round-status">
              <el-tag :type="round.is_completed ? 'success' : 'warning'" size="small">
                {{ round.is_completed ? '已完成' : '未开始' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="$router.push('/admin')">
        <el-icon><Setting /></el-icon>
        管理后台
      </el-button>
      <el-button @click="toggleSound">
        <el-icon><component :is="soundEnabled ? 'Mute' : 'Bell'" /></el-icon>
        {{ soundEnabled ? '关闭音效' : '开启音效' }}
      </el-button>
      <el-button @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>

    <!-- 中奖弹窗 -->
    <el-dialog
      v-model="showWinnerDialog"
      :title="`🎉 ${currentRound?.name} 中奖名单`"
      width="600px"
      :show-close="false"
      :close-on-click-modal="false"
      custom-class="winner-dialog"
    >
      <div class="winner-result">
        <div 
          v-for="winner in currentWinners" 
          :key="winner.id"
          class="winner-card"
        >
          <div class="winner-avatar">{{ winner.name[0] }}</div>
          <div class="winner-info">
            <div class="winner-name-large">{{ winner.name }}</div>
            <div class="winner-dept-large">{{ winner.department || '未知部门' }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" size="large" @click="closeWinnerDialog">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import confetti from 'canvas-confetti'
import { Howl } from 'howler'
import { useLotteryStore } from '../stores/lottery'
import { lotteryApi, otherApi } from '../api'

const store = useLotteryStore()

// 状态
const qrCode = ref('')
const isDrawing = ref(false)
const isRolling = ref(false)
const rollingName = ref('')
const showWinnerDialog = ref(false)
const currentWinners = ref([])
const soundEnabled = ref(true)
let rollInterval = null
let rollSound = null
let winSound = null

// 计算属性
const currentSession = computed(() => store.currentSession)
const rounds = computed(() => store.rounds)
const winners = computed(() => store.winners)
const participantCount = computed(() => store.participantCount)
const currentRound = computed(() => store.currentRound)

// 初始化音效
const initSounds = () => {
  // 使用在线音效，实际项目中可以替换为本地文件
  rollSound = new Howl({
    src: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'],
    loop: true,
    volume: 0.5
  })
  
  winSound = new Howl({
    src: ['https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'],
    volume: 0.7
  })
}

// 获取二维码
const fetchQRCode = async () => {
  try {
    const res = await otherApi.getQRCode()
    if (res.success) {
      qrCode.value = res.data.qrCode
    }
  } catch (error) {
    console.error('获取二维码失败:', error)
  }
}

// 开始抽奖
const startDraw = async () => {
  if (!currentRound.value) return
  
  isDrawing.value = true
  isRolling.value = true
  
  // 播放滚动音效
  if (soundEnabled.value && rollSound) {
    rollSound.play()
  }
  
  // 开始滚动名字
  const availableParticipants = await fetchAvailableParticipants()
  if (availableParticipants.length === 0) {
    ElMessage.warning('没有可抽奖的参与者')
    isDrawing.value = false
    return
  }
  
  rollInterval = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * availableParticipants.length)
    rollingName.value = availableParticipants[randomIndex].name
  }, 80)
}

// 停止抽奖
const stopDraw = async () => {
  if (!currentRound.value) return
  
  isRolling.value = false
  clearInterval(rollInterval)
  
  // 停止滚动音效
  if (rollSound) {
    rollSound.stop()
  }
  
  try {
    // 计算还需要抽取的人数
    const remaining = currentRound.value.quantity - (currentRound.value.winners_count || 0)
    const count = Math.min(remaining, 1) // 每次抽1人，可以改成批量
    
    const res = await store.draw(currentRound.value.id, count)
    if (res.success) {
      currentWinners.value = res.data
      
      // 播放中奖音效
      if (soundEnabled.value && winSound) {
        winSound.play()
      }
      
      // 显示中奖弹窗
      showWinnerDialog.value = true
      
      // 庆祝动画
      triggerConfetti()
      
      // 更新当前轮次
      await store.fetchCurrentRound()
    }
  } catch (error) {
    ElMessage.error(error.message)
  }
  
  isDrawing.value = false
  rollingName.value = ''
}

// 获取可抽奖的参与者
const fetchAvailableParticipants = async () => {
  try {
    const res = await lotteryApi.getAvailableParticipants(currentRound.value?.id)
    if (res.success) {
      return res.data
    }
  } catch (error) {
    console.error('获取参与者失败:', error)
  }
  return []
}

// 庆祝动画
const triggerConfetti = () => {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  const random = (min, max) => Math.random() * (max - min) + min

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D']
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D']
    })
  }, 250)
}

// 关闭中奖弹窗
const closeWinnerDialog = () => {
  showWinnerDialog.value = false
  currentWinners.value = []
}

// 切换音效
const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  ElMessage.success(soundEnabled.value ? '音效已开启' : '音效已关闭')
}

// 刷新数据
const refreshData = async () => {
  await Promise.all([
    store.fetchCurrentSession(),
    store.fetchRounds(currentSession.value?.id),
    store.fetchParticipants(),
    store.fetchWinners(),
    store.fetchCurrentRound()
  ])
  ElMessage.success('数据已刷新')
}

// 定时刷新
let refreshTimer = null

onMounted(async () => {
  await store.fetchCurrentSession()
  if (currentSession.value) {
    await Promise.all([
      store.fetchRounds(currentSession.value.id),
      store.fetchParticipants(),
      store.fetchWinners(),
      store.fetchCurrentRound()
    ])
  }
  
  fetchQRCode()
  initSounds()
  
  // 每30秒刷新一次数据
  refreshTimer = setInterval(() => {
    store.fetchParticipants()
    store.fetchWinners()
  }, 30000)
})

onUnmounted(() => {
  if (rollInterval) clearInterval(rollInterval)
  if (refreshTimer) clearInterval(refreshTimer)
  if (rollSound) rollSound.unload()
  if (winSound) winSound.unload()
})
</script>

<style scoped>
.big-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #8B0000 100%);
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰性背景 */
.big-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
  position: relative;
  z-index: 1;
}

.lantern {
  font-size: 48px;
  animation: swing 2s ease-in-out infinite;
}

.lantern.left {
  margin-right: 30px;
}

.lantern.right {
  margin-left: 30px;
  animation-delay: -1s;
}

@keyframes swing {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.main-title {
  font-size: 48px;
  color: #FFD700;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.5);
  margin: 0;
  letter-spacing: 10px;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  margin: 20px 0;
  position: relative;
  z-index: 1;
}

/* 中奖名单 */
.winners-section,
.rounds-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #DC143C;
  margin-bottom: 15px;
  text-align: center;
  border-bottom: 2px solid #FFD700;
  padding-bottom: 10px;
}

.winners-list {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.winner-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #FFF8DC 0%, #FFFACD 100%);
  border-radius: 8px;
  border-left: 4px solid #FFD700;
  font-size: 14px;
}

.winner-prize {
  font-weight: bold;
  color: #DC143C;
  min-width: 70px;
}

.winner-name {
  flex: 1;
  font-weight: bold;
  color: #333;
  margin: 0 10px;
}

.winner-dept {
  color: #666;
  font-size: 12px;
}

.no-winners {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

/* 抽奖区 */
.lottery-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  border: 3px solid rgba(255, 215, 0, 0.3);
}

/* 二维码区 */
.qrcode-area {
  text-align: center;
  margin-bottom: 30px;
}

.qrcode-title {
  font-size: 24px;
  color: #FFD700;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.qrcode-img {
  width: 250px;
  height: 250px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  background: white;
  padding: 10px;
}

.qrcode-loading {
  width: 250px;
  height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  color: #DC143C;
}

.participant-count {
  margin-top: 20px;
  font-size: 18px;
  color: #FFD700;
}

.participant-count .count {
  font-size: 32px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* 抽奖动画区 */
.drawing-area {
  text-align: center;
  margin-bottom: 30px;
}

.drawing-prize {
  font-size: 36px;
  color: #FFD700;
  margin-bottom: 30px;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.5);
}

.drawing-name {
  font-size: 72px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.5);
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px 60px;
  border: 3px solid #FFD700;
}

.drawing-name.rolling {
  animation: pulse 0.1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.drawing-count {
  margin-top: 20px;
  font-size: 24px;
  color: #FFD700;
}

/* 控制按钮 */
.control-area {
  display: flex;
  justify-content: center;
}

.start-btn,
.stop-btn {
  width: 200px;
  height: 60px;
  font-size: 24px;
  font-weight: bold;
}

.start-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  color: #8B0000;
}

.stop-btn {
  background: linear-gradient(135deg, #FF6B6B 0%, #DC143C 100%);
  border: none;
}

.all-complete {
  font-size: 32px;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* 奖项进度 */
.rounds-list {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.round-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #ccc;
  transition: all 0.3s;
}

.round-item.active {
  background: linear-gradient(135deg, #FFF8DC 0%, #FFE4B5 100%);
  border-left-color: #FFD700;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.round-item.completed {
  background: #e8f5e9;
  border-left-color: #4caf50;
  opacity: 0.7;
}

.round-info {
  display: flex;
  flex-direction: column;
}

.round-name {
  font-weight: bold;
  color: #333;
}

.round-quantity {
  font-size: 12px;
  color: #666;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 20px 0;
  position: relative;
  z-index: 1;
}

/* 中奖弹窗 */
:deep(.winner-dialog) {
  background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
  border-radius: 20px;
}

:deep(.winner-dialog .el-dialog__title) {
  color: #FFD700;
  font-size: 28px;
}

:deep(.winner-dialog .el-dialog__header) {
  border-bottom: 2px solid #FFD700;
  padding: 20px;
}

.winner-result {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.winner-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  border: 3px solid #FFD700;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.winner-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  color: #8B0000;
  margin: 0 auto 15px;
}

.winner-name-large {
  font-size: 32px;
  font-weight: bold;
  color: #DC143C;
  margin-bottom: 10px;
}

.winner-dept-large {
  font-size: 18px;
  color: #666;
}

/* 响应式 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .winners-section,
  .rounds-section {
    max-height: 300px;
  }
  
  .main-title {
    font-size: 32px;
  }
  
  .drawing-name {
    font-size: 48px;
  }
}

@media (max-width: 768px) {
  .big-screen {
    padding: 10px;
  }
  
  .header {
    padding: 10px 0;
  }
  
  .lantern {
    font-size: 32px;
  }
  
  .main-title {
    font-size: 24px;
    letter-spacing: 5px;
  }
  
  .lottery-section {
    padding: 20px;
  }
  
  .qrcode-img,
  .qrcode-loading {
    width: 180px;
    height: 180px;
  }
  
  .drawing-name {
    font-size: 36px;
    padding: 15px 30px;
  }
  
  .toolbar {
    flex-wrap: wrap;
  }
}
</style>