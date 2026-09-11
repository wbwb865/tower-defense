import { reactive } from 'vue'

export const auth = reactive({
  user: JSON.parse(localStorage.getItem('td_user') || 'null'),
  token: localStorage.getItem('td_token') || ''
})

export function setAuth(user, token) {
  auth.user = user
  auth.token = token
  localStorage.setItem('td_user', JSON.stringify(user))
  localStorage.setItem('td_token', token)
}

export function clearAuth() {
  auth.user = null
  auth.token = ''
  localStorage.removeItem('td_user')
  localStorage.removeItem('td_token')
}
