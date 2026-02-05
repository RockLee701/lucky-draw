import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  sessionApi, 
  roundApi, 
  participantApi, 
  lotteryApi, 
  otherApi 
} from '../api'

export const useLotteryStore = defineStore('lottery', () => {
  // State
  const currentSession = ref(null)
  const rounds = ref([])
  const participants = ref([])
  const winners = ref([])
  const currentRound = ref(null)
  const serverInfo = ref(null)
  const loading = ref(false)

  // Getters
  const isSessionActive = computed(() => currentSession.value?.status === 'ongoing')
  const completedRounds = computed(() => rounds.value.filter(r => r.is_completed))
  const pendingRounds = computed(() => rounds.value.filter(r => !r.is_completed))
  const participantCount = computed(() => participants.value.length)
  const winnerCount = computed(() => winners.value.length)

  // Actions
  // 获取当前会话
  const fetchCurrentSession = async () => {
    try {
      loading.value = true
      const res = await sessionApi.getCurrent()
      if (res.success) {
        currentSession.value = res.data
        return res.data
      }
      return null
    } catch (error) {
      console.error('获取当前会话失败:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  // 创建会话
  const createSession = async (name) => {
    const res = await sessionApi.create(name)
    if (res.success) {
      currentSession.value = res.data
      return res.data
    }
    throw new Error(res.error || '创建失败')
  }

  // 关闭会话
  const closeSession = async (id) => {
    const res = await sessionApi.close(id)
    if (res.success) {
      currentSession.value = null
    }
    return res
  }

  // 初始化默认轮次
  const initDefaultRounds = async (sessionId) => {
    const res = await sessionApi.initRounds(sessionId)
    if (res.success) {
      rounds.value = res.data
    }
    return res
  }

  // 获取轮次列表
  const fetchRounds = async (sessionId) => {
    const res = await roundApi.getBySession(sessionId)
    if (res.success) {
      rounds.value = res.data
    }
    return res
  }

  // 创建轮次
  const createRound = async (sessionId, data) => {
    const res = await roundApi.create(sessionId, data)
    if (res.success) {
      await fetchRounds(sessionId)
    }
    return res
  }

  // 更新轮次
  const updateRound = async (id, data) => {
    const res = await roundApi.update(id, data)
    if (res.success && currentSession.value) {
      await fetchRounds(currentSession.value.id)
    }
    return res
  }

  // 删除轮次
  const deleteRound = async (id) => {
    const res = await roundApi.delete(id)
    if (res.success && currentSession.value) {
      await fetchRounds(currentSession.value.id)
    }
    return res
  }

  // 获取参与者列表
  const fetchParticipants = async () => {
    const res = await participantApi.getAll()
    if (res.success) {
      participants.value = res.data
    }
    return res
  }

  // 导入Excel
  const importExcel = async (formData) => {
    const res = await participantApi.importExcel(formData)
    if (res.success) {
      await fetchParticipants()
    }
    return res
  }

  // 生成测试数据
  const generateTestData = async () => {
    const res = await participantApi.generateTest()
    if (res.success) {
      await fetchParticipants()
    }
    return res
  }

  // 获取当前轮次
  const fetchCurrentRound = async () => {
    try {
      const res = await lotteryApi.getCurrentRound()
      if (res.success) {
        currentRound.value = res.data
        return res.data
      }
      return null
    } catch (error) {
      console.error('获取当前轮次失败:', error)
      return null
    }
  }

  // 获取中奖列表
  const fetchWinners = async () => {
    const res = await lotteryApi.getWinners()
    if (res.success) {
      winners.value = res.data
    }
    return res
  }

  // 执行抽奖
  const draw = async (roundId, count = 1) => {
    const res = await lotteryApi.draw(roundId, count)
    if (res.success) {
      await fetchWinners()
      await fetchCurrentRound()
    }
    return res
  }

  // 获取服务器信息
  const fetchServerInfo = async () => {
    const res = await otherApi.getServerInfo()
    if (res.success) {
      serverInfo.value = res.data
    }
    return res
  }

  // 加入抽奖
  const joinLottery = async (name, deviceId) => {
    const res = await lotteryApi.join(name, deviceId)
    return res
  }

  return {
    // State
    currentSession,
    rounds,
    participants,
    winners,
    currentRound,
    serverInfo,
    loading,
    // Getters
    isSessionActive,
    completedRounds,
    pendingRounds,
    participantCount,
    winnerCount,
    // Actions
    fetchCurrentSession,
    createSession,
    closeSession,
    initDefaultRounds,
    fetchRounds,
    createRound,
    updateRound,
    deleteRound,
    fetchParticipants,
    importExcel,
    generateTestData,
    fetchCurrentRound,
    fetchWinners,
    draw,
    fetchServerInfo,
    joinLottery
  }
})