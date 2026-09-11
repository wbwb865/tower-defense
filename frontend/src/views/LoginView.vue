<template>
  <div class="page">
    <h1 class="page-title">登录</h1>
    <div class="card form-card">
      <div class="form-head">
        <span class="form-logo">⚔</span>
        <p>欢迎回来，继续你的守城之旅</p>
      </div>
      <el-form :model="form" label-width="70px" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">登录</el-button>
          <router-link to="/register" class="link">没有账号？去注册</router-link>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api/index.js'
import { setAuth } from '../store/auth.js'

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res = await authApi.login({ username: form.username, password: form.password })
    setAuth(res.data.user, res.data.token)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-card {
  width: 400px;
  max-width: 90%;
  padding: 28px;
}

.form-head {
  text-align: center;
  margin-bottom: 22px;
}

.form-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 4px;
  font-size: 24px;
  background: linear-gradient(135deg, #00b8d4, #7a2bd6);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
  margin-bottom: 12px;
}

.form-head p {
  color: #5f8ba0;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
}

.link {
  margin-left: 12px;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
}
</style>
