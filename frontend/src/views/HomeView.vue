<template>
  <div class="page home">
    <div class="hero">
      <div class="hero-badge">GRID·EDGE·STRATEGY</div>
      <h1 class="page-title">边路塔防</h1>
      <p class="page-sub">敌人沿网格边前进，你铺路引导、沿边布防，守住出口！</p>
      <div class="hero-actions">
        <router-link to="/game" class="btn-primary">开始游戏</router-link>
        <router-link to="/leaderboard" class="btn-ghost">查看排行榜</router-link>
      </div>
    </div>

    <div class="card howto">
      <h2>玩法说明</h2>
      <div class="howto-grid">
        <div class="howto-item">
          <span class="howto-icon" style="--c:#00e5ff">路</span>
          <div class="howto-body">
            <b>铺路引导</b>
            <span>敌人沿格子边移动，从生成格的两条边出生、从终点格的两条边离开。路块必须与墙壁或其他路块相邻，重叠边不可走、非重叠边产生可走边——用路块造捷径、改路线，让敌人绕远路、多挨打。</span>
          </div>
        </div>
        <div class="howto-item">
          <span class="howto-icon" style="--c:#ff2bd6">防</span>
          <div class="howto-body">
            <b>沿边布防</b>
            <span>在格子的边上放置武器（箭塔 / 炮塔 / 冰塔 / 毒塔）和防具（减速带 / 路障），攻击或阻挡经过的敌人。</span>
          </div>
        </div>
        <div class="howto-item">
          <span class="howto-icon" style="--c:#ffe14d">币</span>
          <div class="howto-body">
            <b>经济管理</b>
            <span>击杀敌人、金币路块、通关奖励都能获得金币，合理安排建造顺序。</span>
          </div>
        </div>
        <div class="howto-item">
          <span class="howto-icon" style="--c:#2effa0">守</span>
          <div class="howto-body">
            <b>守住出口</b>
            <span>任何时候都要保留一条通往终点的通路，否则无法开始波次。敌人到达出口会扣生命，生命归零即失败，坚持 15 波即胜利。</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="levels.length" class="card levels">
      <h2>选择关卡</h2>
      <div class="level-list">
        <button v-for="lv in levels" :key="lv.id" class="level-item" @click="play(lv.id)">
          <div class="level-info">
            <span class="level-name">{{ lv.name }}</span>
            <span class="level-meta">{{ lv.width }} x {{ lv.height }} · 初始金币 {{ lv.startGold }} · 生命 {{ lv.lives }}</span>
            <span v-if="lv.config && lv.config.desc" class="level-rule">{{ lv.config.desc }}</span>
          </div>
          <span class="level-arrow">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { levelApi } from '../api/index.js'

const router = useRouter()
const levels = ref([])

onMounted(async () => {
  try {
    const res = await levelApi.list()
    levels.value = res.data || []
  } catch (e) {
    levels.value = []
  }
})

function play(id) {
  router.push(`/game/${id}`)
}
</script>

<style scoped>
.home {
  gap: 20px;
}

.hero {
  text-align: center;
  padding: 44px 0 16px;
  position: relative;
}

.hero-badge {
  display: inline-block;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 3px;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 2px;
  padding: 5px 16px;
  margin-bottom: 18px;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.5);
  backdrop-filter: blur(8px);
}

.hero .page-title {
  font-size: 44px;
  margin-bottom: 12px;
}

.hero .page-sub {
  font-size: 15px;
  margin-bottom: 28px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 18px;
}

.card {
  width: 100%;
  max-width: 760px;
}

.card h2 {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 16px;
  margin-bottom: 16px;
  color: #00e5ff;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}

.card h2::before {
  content: '▸';
  color: #ff2bd6;
  text-shadow: 0 0 8px rgba(255, 43, 214, 0.6);
}

.howto-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.howto-item {
  display: flex;
  gap: 12px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px;
  padding: 14px;
  transition: all 0.2s ease;
}

.howto-item:hover {
  border-color: var(--c);
  background: rgba(0, 229, 255, 0.05);
  box-shadow: 0 0 16px color-mix(in srgb, var(--c) 18%, transparent);
  transform: translateY(-2px);
}

.howto-icon {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  color: var(--c);
  border: 1px solid var(--c);
  flex-shrink: 0;
  text-shadow: 0 0 8px var(--c);
  box-shadow: 0 0 12px color-mix(in srgb, var(--c) 30%, transparent);
}

.howto-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.howto-body b {
  color: var(--c);
  font-size: 14px;
  letter-spacing: 1px;
}

.howto-body span {
  color: #9fb8c8;
  font-size: 13px;
  line-height: 1.6;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  text-align: left;
}

.level-item:hover {
  border-color: #00e5ff;
  background: rgba(0, 229, 255, 0.07);
  transform: translateX(4px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
}

.level-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.level-name {
  font-size: 15px;
  font-weight: 600;
  color: #d7e6ee;
}

.level-meta {
  color: #5f8ba0;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.level-rule {
  color: #b388ff;
  font-size: 12px;
  line-height: 1.5;
  text-shadow: 0 0 6px rgba(179, 136, 255, 0.3);
}

.level-arrow {
  color: #00e5ff;
  font-size: 18px;
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.2s ease;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

.level-item:hover .level-arrow {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 640px) {
  .howto-grid {
    grid-template-columns: 1fr;
  }
}
</style>
