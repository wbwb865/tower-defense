<template>
  <div class="page">
    <h1 class="page-title">注册</h1>
    <div class="card form-card">
      <div class="form-head">
        <span class="form-logo">🛡</span>
        <p>创建账号，开启你的守城之路</p>
      </div>
      <el-form :model="form" label-width="70px" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="3-20 位字母数字" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入密码" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="submit">注册</el-button>
          <router-link to="/login" class="link">已有账号？去登录</router-link>
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

const router = useRouter()
const loading = ref(false)
const form = reactive({ username: '', password: '', confirm: '' })

async function submit() {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) {
    ElMessage.warning('用户名需为 3-20 位字母、数字或下划线')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (form.password !== form.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await authApi.register({ username: form.username, password: form.password })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
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
  background: linear-gradient(135deg, #7a2bd6, #ff2bd6);
  box-shadow: 0 0 20px rgba(255, 43, 214, 0.4);
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
