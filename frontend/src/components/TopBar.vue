<template>
  <div class="topbar">
    <div class="stats">
      <div class="stat" style="--c:#e0b84f">
        <span class="stat-icon">◈</span>
        <div class="stat-body">
          <span class="stat-label">金币</span>
          <b>{{ hud.gold }}</b>
        </div>
      </div>
      <div class="stat" style="--c:#e74c3c">
        <span class="stat-icon">♥</span>
        <div class="stat-body">
          <span class="stat-label">生命</span>
          <b>{{ hud.lives }}</b>
        </div>
      </div>
      <div class="stat" style="--c:#5aa7e0">
        <span class="stat-icon">≋</span>
        <div class="stat-body">
          <span class="stat-label">波次</span>
          <b>{{ hud.wave }} / {{ totalWaves }}</b>
        </div>
      </div>
      <div class="stat" style="--c:#9b59b6">
        <span class="stat-icon">★</span>
        <div class="stat-body">
          <span class="stat-label">得分</span>
          <b>{{ hud.score }}</b>
        </div>
      </div>
    </div>
    <div class="controls">
      <button
        v-if="hud.state === 'build'"
        class="btn-primary"
        @click="$emit('start-wave')"
      >
        开始第 {{ hud.wave + 1 }} 波
      </button>
      <span v-else-if="hud.state === 'wave'" class="wave-tag">战斗进行中...</span>
      <button class="btn-ghost" @click="$emit('toggle-pause')">
        {{ hud.paused ? '继续' : '暂停' }}
      </button>
      <button class="btn-ghost" @click="$emit('toggle-speed')">速度 x{{ hud.speed }}</button>
      <button class="btn-ghost" @click="$emit('restart')">重开</button>
      <button class="btn-ghost" @click="$emit('exit')">退出</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  hud: { type: Object, required: true },
  totalWaves: { type: Number, default: 15 }
})
defineEmits(['start-wave', 'toggle-pause', 'toggle-speed', 'restart', 'exit'])
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(160deg, rgba(10, 18, 30, 0.85), rgba(6, 10, 18, 0.92));
  border: 1px solid rgba(0, 229, 255, 0.16);
  border-radius: 6px;
  padding: 12px 18px;
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.06);
  backdrop-filter: blur(12px);
}

.stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.14);
  border-radius: 4px;
  padding: 8px 14px;
  min-width: 96px;
  transition: all 0.2s ease;
}

.stat:hover {
  border-color: var(--c);
  box-shadow: 0 0 16px color-mix(in srgb, var(--c) 22%, transparent);
}

.stat-icon {
  font-size: 18px;
  color: var(--c);
  text-shadow: 0 0 8px color-mix(in srgb, var(--c) 70%, transparent);
}

.stat-body {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.stat-label {
  color: #5f8ba0;
  font-size: 10px;
  letter-spacing: 2px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.stat b {
  color: #e8f6ff;
  font-size: 17px;
  font-weight: 700;
  font-family: 'Consolas', 'Courier New', monospace;
  text-shadow: 0 0 8px color-mix(in srgb, var(--c) 40%, transparent);
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.wave-tag {
  color: #ff2bd6;
  font-weight: 600;
  font-size: 14px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(255, 43, 214, 0.5);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
