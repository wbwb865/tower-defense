import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败'
    return Promise.reject(new Error(msg))
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
}

export const levelApi = {
  list: () => api.get('/levels'),
  detail: (id) => api.get(`/levels/${id}`)
}

export const recordApi = {
  save: (data) => api.post('/records', data),
  mine: () => api.get('/user/records')
}

export const leaderboardApi = {
  top: (levelId) => api.get('/leaderboard', { params: { levelId } })
}

export default api
