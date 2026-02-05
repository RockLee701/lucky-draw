import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    const message = error.response?.data?.error || '网络错误'
    return Promise.reject(new Error(message))
  }
)

// 会话管理
export const sessionApi = {
  create: (name) => api.post('/api/admin/sessions', { name }),
  getCurrent: () => api.get('/api/admin/sessions/current'),
  getAll: () => api.get('/api/admin/sessions'),
  close: (id) => api.post(`/api/admin/sessions/${id}/close`),
  initRounds: (id) => api.post(`/api/admin/sessions/${id}/init-rounds`)
}

// 轮次管理
export const roundApi = {
  getBySession: (sessionId) => api.get(`/api/admin/sessions/${sessionId}/rounds`),
  create: (sessionId, data) => api.post(`/api/admin/sessions/${sessionId}/rounds`, data),
  update: (id, data) => api.put(`/api/admin/rounds/${id}`, data),
  delete: (id) => api.delete(`/api/admin/rounds/${id}`)
}

// 参与者管理
export const participantApi = {
  getAll: () => api.get('/api/lottery/participants'),
  importExcel: (formData) => api.post('/api/admin/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateTest: () => api.post('/api/admin/generate-test-data')
}

// 抽奖相关
export const lotteryApi = {
  getCurrentRound: () => api.get('/api/lottery/current-round'),
  getAvailableParticipants: (roundId) => api.get('/api/lottery/available-participants', { params: { roundId } }),
  draw: (roundId, count = 1) => api.post('/api/lottery/draw', { roundId, count }),
  getWinners: () => api.get('/api/lottery/winners'),
  join: (name, deviceId) => api.post('/api/lottery/join', { name, deviceId })
}

// 导出
export const exportApi = {
  exportWinners: (sessionId) => api.get(`/api/export/winners?sessionId=${sessionId}`, { responseType: 'blob' }),
  exportParticipants: (sessionId) => api.get(`/api/export/participants?sessionId=${sessionId}`, { responseType: 'blob' })
}

// 其他
export const otherApi = {
  getQRCode: () => api.get('/api/qrcode'),
  getServerInfo: () => api.get('/api/server-info')
}

export default api