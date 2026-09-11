<template>
  <div class="build-menu">
    <div class="hint">路块需与墙壁或其他路块相邻；重叠边不可走，非重叠边产生可走边。始终保留一条通往终点的通路。点击放置，右键取消</div>

    <div class="group">
      <div class="group-title">方块（铺路引导）</div>
      <div class="items">
        <button
          v-for="(def, key) in BLOCK_TYPES"
          :key="'b' + key"
          class="item"
          :class="{ selected: isSelected('block', key), disabled: !canAfford(def.cost) }"
          :title="def.desc"
          @click="select('block', key)"
        >
          <span class="swatch" :style="{ background: def.color }"></span>
          <span class="name">{{ def.name }}</span>
          <span class="cost">{{ def.cost }}</span>
        </button>
      </div>
    </div>

    <div class="group">
      <div class="group-title">武器（放在边上）</div>
      <div class="items">
        <button
          v-for="(def, key) in WEAPON_TYPES"
          :key="'w' + key"
          class="item"
          :class="{ selected: isSelected('weapon', key), disabled: !canAfford(def.cost) || !isUnlocked('weapon', key) || isBanned('weapon', key), locked: !isUnlocked('weapon', key), banned: isBanned('weapon', key) }"
          :title="isBanned('weapon', key) ? '该地图禁用此武器' : (isUnlocked('weapon', key) ? def.desc : unlockHint(def))"
          @click="select('weapon', key)"
        >
          <span class="swatch" :style="{ background: def.color }"></span>
          <span class="name">{{ isBanned('weapon', key) ? def.name : (isUnlocked('weapon', key) ? def.name : '？？？') }}</span>
          <span v-if="isBanned('weapon', key)" class="lock">🚫</span>
          <span v-else-if="isUnlocked('weapon', key)" class="cost">{{ def.cost }}</span>
          <span v-else class="lock">🔒</span>
        </button>
      </div>
    </div>

    <div class="group">
      <div class="group-title">防具（放在边上）</div>
      <div class="items">
        <button
          v-for="(def, key) in ARMOR_TYPES"
          :key="'a' + key"
          class="item"
          :class="{ selected: isSelected('armor', key), disabled: !canAfford(def.cost) }"
          :title="def.desc"
          @click="select('armor', key)"
        >
          <span class="swatch" :style="{ background: def.color }"></span>
          <span class="name">{{ def.name }}</span>
          <span class="cost">{{ def.cost }}</span>
        </button>
      </div>
    </div>

    <div class="group">
      <div class="group-title">陷阱（放在边上，被动触发）</div>
      <div class="items">
        <button
          v-for="(def, key) in TRAP_TYPES"
          :key="'t' + key"
          class="item"
          :class="{ selected: isSelected('trap', key), disabled: !canAfford(def.cost) || !isUnlocked('trap', key), locked: !isUnlocked('trap', key) }"
          :title="isUnlocked('trap', key) ? def.desc : unlockHint(def)"
          @click="select('trap', key)"
        >
          <span class="swatch" :style="{ background: def.color }"></span>
          <span class="name">{{ isUnlocked('trap', key) ? def.name : '？？？' }}</span>
          <span v-if="isUnlocked('trap', key)" class="cost">{{ def.cost }}</span>
          <span v-else class="lock">🔒</span>
        </button>
      </div>
    </div>

    <div class="group">
      <div class="group-title">传送门（成对放在边上）</div>
      <div class="items">
        <button
          v-for="(def, key) in PORTAL_TYPES"
          :key="'p' + key"
          class="item"
          :class="{ selected: isSelected('portal', key), disabled: !canAfford(def.cost) }"
          :title="def.desc"
          @click="select('portal', key)"
        >
          <span class="swatch" :style="{ background: def.color }"></span>
          <span class="name">{{ def.name }}</span>
          <span class="cost">{{ def.cost }}</span>
        </button>
      </div>
    </div>

    <div class="op-row">
      <button
        class="item op"
        :class="{ selected: isUpgrade }"
        @click="toggleUpgrade"
      >
        <span class="swatch" style="background:#ffe14d"></span>
        <span class="name">升级</span>
        <span class="cost">武器 Lv.2/3</span>
      </button>
      <button
        class="item op"
        :class="{ selected: isSell }"
        @click="toggleSell"
      >
        <span class="swatch" style="background:#ff5252"></span>
        <span class="name">拆除</span>
        <span class="cost">返还100%</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { BLOCK_TYPES, WEAPON_TYPES, ARMOR_TYPES, TRAP_TYPES, PORTAL_TYPES } from '../game/config.js'

const props = defineProps({
  gold: { type: Number, default: 0 },
  buildMode: { type: Object, default: null },
  unlocked: { type: Function, default: () => true },
  banned: { type: Array, default: () => [] }
})
const emit = defineEmits(['select'])

function canAfford(cost) {
  return props.gold >= cost
}

function isUnlocked(kind, type) {
  return props.unlocked(kind, type)
}

function isBanned(kind, type) {
  return kind === 'weapon' && props.banned.includes(type)
}

function unlockHint(def) {
  if (!def.unlock) return def.desc
  const u = def.unlock
  const cond = u.kills !== undefined ? `累计击杀 ${u.kills}` : `到达第 ${u.wave} 波`
  return `隐藏设施，解锁条件：${cond}`
}

function isSelected(kind, type) {
  const m = props.buildMode
  return m && m.kind === kind && m.type === type
}

const isSell = props.buildMode && props.buildMode.kind === 'sell'
const isUpgrade = props.buildMode && props.buildMode.kind === 'upgrade'

function select(kind, type) {
  emit('select', { kind, type })
}

function toggleSell() {
  emit('select', props.buildMode && props.buildMode.kind === 'sell' ? null : { kind: 'sell', type: null })
}

function toggleUpgrade() {
  emit('select', props.buildMode && props.buildMode.kind === 'upgrade' ? null : { kind: 'upgrade', type: null })
}
</script>

<style scoped>
.build-menu {
  width: 264px;
  flex-shrink: 0;
  background: linear-gradient(160deg, rgba(10, 18, 30, 0.85), rgba(6, 10, 18, 0.92));
  border: 1px solid rgba(0, 229, 255, 0.16);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  box-shadow: 0 0 24px rgba(0, 229, 255, 0.06);
  backdrop-filter: blur(14px);
}

@media (max-width: 720px) {
  .build-menu {
    width: 100%;
    max-height: none;
  }
}

.hint {
  font-size: 12px;
  color: #5f8ba0;
  line-height: 1.6;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px;
  padding: 10px 12px;
  font-family: 'Consolas', 'Courier New', monospace;
}

.group-title {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: #9fd8e8;
  margin-bottom: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 0 0 6px rgba(0, 229, 255, 0.3);
}

.group-title::before {
  content: '▸';
  color: #ff2bd6;
  text-shadow: 0 0 6px rgba(255, 43, 214, 0.6);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 4px;
  padding: 8px 12px;
  color: #c6dce8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
}

.item:hover:not(.disabled) {
  border-color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  box-shadow: 0 0 14px rgba(0, 229, 255, 0.15);
  transform: translateX(3px);
}

.item.selected {
  border-color: #00e5ff;
  background: rgba(0, 229, 255, 0.14);
  box-shadow: 0 0 0 1px #00e5ff, 0 0 18px rgba(0, 229, 255, 0.25);
}

.item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.item.locked .swatch {
  filter: grayscale(1) brightness(0.6);
}

.item.banned {
  opacity: 0.45;
  cursor: not-allowed;
}

.item.banned .swatch {
  filter: grayscale(1) brightness(0.5);
}

.item.banned .name {
  text-decoration: line-through;
}

.lock {
  color: #5f8ba0;
  font-size: 13px;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
}

.name {
  flex: 1;
}

.cost {
  color: #ffe14d;
  font-weight: 700;
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  background: rgba(255, 225, 77, 0.08);
  border: 1px solid rgba(255, 225, 77, 0.2);
  border-radius: 3px;
  padding: 2px 8px;
  text-shadow: 0 0 6px rgba(255, 225, 77, 0.4);
}

.item.sell .cost {
  color: #ff2bd6;
  background: rgba(255, 43, 214, 0.08);
  border-color: rgba(255, 43, 214, 0.25);
  text-shadow: 0 0 6px rgba(255, 43, 214, 0.4);
}

.op-row {
  display: flex;
  gap: 8px;
}

.op-row .item.op {
  flex: 1;
}

.item.op .cost {
  color: #ffe14d;
  background: rgba(255, 225, 77, 0.08);
  border-color: rgba(255, 225, 77, 0.25);
  text-shadow: 0 0 6px rgba(255, 225, 77, 0.4);
  font-size: 10px;
  padding: 2px 6px;
}

</style>
