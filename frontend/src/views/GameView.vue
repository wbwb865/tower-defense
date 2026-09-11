<template>
  <div class="game-page">
    <div v-if="loading" class="loading">关卡加载中...</div>
    <template v-else>
      <div class="game-head">
        <div class="level-name">{{ level.name }}</div>
        <div v-if="mapDesc" class="map-rule">{{ mapDesc }}</div>
        <TopBar
          :hud="hud"
          :total-waves="TOTAL_WAVES"
          @start-wave="startWave"
          @toggle-pause="togglePause"
          @toggle-speed="toggleSpeed"
          @restart="restart"
          @exit="exit"
        />
      </div>
      <div class="game-body">
        <div class="canvas-col">
          <div v-if="buildHint" class="build-hint">
            <span class="build-hint-name" :style="{ color: buildHint.color }">{{ buildHint.name }}</span>
            <span class="build-hint-desc">{{ buildHint.desc }}</span>
          </div>
          <GameCanvas
            :engine="engine"
            :build-mode="buildMode"
            @frame="onFrame"
            @notify="notify"
            @cancel-build="cancelBuild"
          />
        </div>
        <BuildMenu
          :gold="hud.gold"
          :build-mode="buildMode"
          :unlocked="isUnlocked"
          :banned="bannedWeapons"
          @select="onSelect"
        />
      </div>
    </template>

    <el-dialog
      v-model="showEnd"
      :title="hud.state === 'win' ? '胜利！' : '失败...'"
      width="420px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="end-content">
        <div class="end-score">最终得分：{{ hud.score }}</div>
        <div class="end-stats">
          <div>到达波次：{{ hud.wave }}</div>
          <div>击杀数：{{ hud.kills }}</div>
          <div>剩余生命：{{ hud.lives }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="exit">返回首页</el-button>
        <el-button type="primary" @click="restart">再来一局</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { GameEngine } from '../game/engine.js'
import { TOTAL_WAVES, BLOCK_TYPES, WEAPON_TYPES, ARMOR_TYPES, TRAP_TYPES, PORTAL_TYPES } from '../game/config.js'
import { levelApi, recordApi } from '../api/index.js'
import { auth } from '../store/auth.js'
import TopBar from '../components/TopBar.vue'
import BuildMenu from '../components/BuildMenu.vue'
import GameCanvas from '../components/GameCanvas.vue'

const DEFAULT_LEVEL = {
  id: 0,
  name: '新手平原',
  width: 14,
  height: 12,
  spawn: { x: 0, y: 6 },
  exit: { x: 14, y: 6 },
  startGold: 120,
  lives: 20
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const level = reactive({ ...DEFAULT_LEVEL })
const engine = ref(null)
const hud = reactive({ gold: 0, lives: 0, wave: 0, score: 0, kills: 0, state: 'build', paused: false, speed: 1 })
const buildMode = ref(null)
const showEnd = ref(false)
let savedResult = false
let gameStartTime = 0

// 隐藏设施解锁通知：记录已通知过的设施，新解锁时提示
const notifiedUnlocks = new Set()
const UNLOCKABLE = [
  { kind: 'weapon', type: 'laser' },
  { kind: 'weapon', type: 'missile' },
  { kind: 'trap', type: 'mine' }
]

const buildHint = computed(() => {
  const m = buildMode.value
  if (!m) return null
  if (m.kind === 'block') {
    const def = BLOCK_TYPES[m.type]
    return { name: def.name, desc: def.desc, color: def.color }
  }
  if (m.kind === 'weapon') {
    const def = WEAPON_TYPES[m.type]
    return { name: def.name, desc: def.desc, color: def.color }
  }
  if (m.kind === 'armor') {
    const def = ARMOR_TYPES[m.type]
    return { name: def.name, desc: def.desc, color: def.color }
  }
  if (m.kind === 'trap') {
    const def = TRAP_TYPES[m.type]
    return { name: def.name, desc: def.desc, color: def.color }
  }
  if (m.kind === 'portal') {
    const def = PORTAL_TYPES[m.type]
    return { name: def.name, desc: def.desc, color: def.color }
  }
  if (m.kind === 'upgrade') {
    return { name: '升级', desc: '点击边上的武器提升等级（Lv.1→2→3），提升射程/伤害/射速', color: '#ffe14d' }
  }
  if (m.kind === 'sell') {
    return { name: '拆除', desc: '点击方块或边上的设施，返还 100% 费用', color: '#ff5252' }
  }
  return null
})

function createEngine(cfg) {
  return new GameEngine({
    width: cfg.width,
    height: cfg.height,
    spawn: cfg.spawn,
    exit: cfg.exit,
    startGold: cfg.startGold,
    lives: cfg.lives,
    config: cfg.config
  })
}

const mapDesc = computed(() => (engine.value && engine.value.mapConfig.desc) || '')
const bannedWeapons = computed(() => (engine.value && engine.value.mapConfig.weaponBan) || [])

onMounted(async () => {
  gameStartTime = Date.now()
  let cfg = { ...DEFAULT_LEVEL }
  const levelId = route.params.levelId
  if (levelId && levelId !== '0') {
    try {
      const res = await levelApi.detail(levelId)
      cfg = res.data
    } catch (e) {
      ElMessage.warning('加载关卡失败，已使用默认关卡')
    }
  }
  Object.assign(level, cfg)
  engine.value = createEngine(cfg)
  hud.gold = engine.value.gold
  hud.lives = engine.value.lives
  loading.value = false
})

function isUnlocked(kind, type) {
  return engine.value ? engine.value.isUnlocked(kind, type) : false
}

function onFrame(eng) {
  hud.gold = eng.gold
  hud.lives = eng.lives
  hud.wave = eng.wave
  hud.score = eng.score
  hud.kills = eng.kills
  hud.state = eng.state
  hud.paused = eng.paused
  hud.speed = eng.speed
  for (const u of UNLOCKABLE) {
    const id = u.kind + ':' + u.type
    if (!notifiedUnlocks.has(id) && eng.isUnlocked(u.kind, u.type)) {
      notifiedUnlocks.add(id)
      const def = u.kind === 'weapon' ? WEAPON_TYPES[u.type] : TRAP_TYPES[u.type]
      ElMessage.success(`已解锁新设施：${def.name}！可在建造菜单中查看`)
    }
  }
  if ((eng.state === 'over' || eng.state === 'win') && !savedResult) {
    savedResult = true
    showEnd.value = true
    saveRecord(eng)
  }
}

async function saveRecord(eng) {
  if (!auth.user) return
  try {
    await recordApi.save({
      levelId: level.id || null,
      score: eng.score,
      wave: eng.wave,
      kills: eng.kills,
      result: eng.state,
      duration: Math.round((Date.now() - gameStartTime) / 1000)
    })
  } catch (e) {
    /* 保存失败不影响游戏 */
  }
}

function startWave() {
  const r = engine.value.startWave()
  if (!r.ok) ElMessage.warning(r.msg)
}

function togglePause() {
  engine.value.paused = !engine.value.paused
}

function toggleSpeed() {
  engine.value.speed = engine.value.speed === 1 ? 2 : engine.value.speed === 2 ? 3 : 1
}

function restart() {
  engine.value = createEngine(level)
  Object.assign(hud, { gold: engine.value.gold, lives: engine.value.lives, wave: 0, score: 0, kills: 0, state: 'build', paused: false, speed: 1 })
  savedResult = false
  showEnd.value = false
  buildMode.value = null
  notifiedUnlocks.clear()
  gameStartTime = Date.now()
}

function exit() {
  router.push('/')
}

function notify(msg) {
  ElMessage.warning(msg)
}

function cancelBuild() {
  buildMode.value = null
}

function onSelect(m) {
  buildMode.value = m
}
</script>

<style scoped>
.game-page {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.loading {
  color: #5f8ba0;
  padding: 60px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.game-head {
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-name {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #00e5ff;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
}

.level-name::before {
  content: '▸';
  color: #ff2bd6;
  text-shadow: 0 0 8px rgba(255, 43, 214, 0.6);
}

.map-rule {
  font-size: 12px;
  color: #b388ff;
  background: rgba(179, 136, 255, 0.08);
  border: 1px solid rgba(179, 136, 255, 0.25);
  border-radius: 4px;
  padding: 6px 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  text-shadow: 0 0 6px rgba(179, 136, 255, 0.4);
}

.game-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  max-width: 1100px;
}

.canvas-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.build-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(160deg, rgba(10, 18, 30, 0.85), rgba(6, 10, 18, 0.92));
  border: 1px solid rgba(0, 229, 255, 0.16);
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.06);
  backdrop-filter: blur(10px);
}

.build-hint-name {
  font-weight: 700;
  flex-shrink: 0;
  color: #00e5ff;
  font-family: 'Consolas', 'Courier New', monospace;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}

.build-hint-desc {
  color: #9fb8c8;
}

@media (max-width: 720px) {
  .game-body {
    flex-direction: column;
    align-items: center;
  }
}

.end-content {
  text-align: center;
}

.end-score {
  font-size: 26px;
  font-weight: 800;
  color: #ffe14d;
  margin-bottom: 16px;
  font-family: 'Consolas', 'Courier New', monospace;
  text-shadow: 0 0 12px rgba(255, 225, 77, 0.4);
}

.end-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #9fb8c8;
  font-size: 14px;
}
</style>
