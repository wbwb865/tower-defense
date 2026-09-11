<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/" class="logo">边路塔防</router-link>
      <div class="nav-links">
        <router-link to="/">首页</router-link>
        <router-link to="/leaderboard">排行榜</router-link>
      </div>
      <div class="nav-user">
        <template v-if="auth.user">
          <span class="nav-username">{{ auth.user.username }}</span>
          <button class="btn-ghost" @click="logout">退出</button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-ghost">登录</router-link>
          <router-link to="/register" class="btn-ghost">注册</router-link>
        </template>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { auth, clearAuth } from './store/auth.js'

const router = useRouter()

function logout() {
  clearAuth()
  router.push('/')
}
</script>

<style scoped>
.app {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 28px;
  height: 60px;
  background: rgba(5, 9, 16, 0.78);
  border-bottom: 1px solid rgba(0, 229, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.08);
}

.logo {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #00e5ff;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
  white-space: nowrap;
}

.nav-links {
  display: flex;
  gap: 6px;
  flex: 1;
}

.nav-links a {
  font-family: 'Consolas', 'Courier New', monospace;
  color: #8fb3c4;
  font-size: 14px;
  letter-spacing: 1px;
  padding: 8px 14px;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-links a:hover {
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.06);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
}

.nav-links a.router-link-active {
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.1);
  box-shadow: inset 0 -2px 0 #00e5ff;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-username {
  color: #b8d4e2;
  font-size: 14px;
  font-family: 'Consolas', 'Courier New', monospace;
}
</style>
