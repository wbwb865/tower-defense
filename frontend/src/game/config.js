// ===== 游戏全局配置 =====

export const CELL = 40          // 每个格子的像素大小
export const TOTAL_WAVES = 15   // 通关所需波数（之后进入无尽模式）

// ===== 方块类型（铺在格子上，决定敌人走的"路"）=====
// 路块规则：敌人沿路块边界行走；路块需至少一条边与墙壁（外圈）或其他路块重叠；
// 重叠边不可走，非重叠边可走；任何时候都必须保留一条从生成线到终点线的通路。
export const BLOCK_TYPES = {
  path: {
    name: '普通路块', cost: 10, color: '#5d6b82', dark: '#39445a',
    speed: 1.0, desc: '基础路块：产生可走边，引导敌人绕行'
  },
  slow: {
    name: '减速路块', cost: 20, color: '#3aa0ff', dark: '#1f6fd0',
    speed: 0.5, desc: '减速路块：产生可走边，经过的敌人减速一半'
  },
  gold: {
    name: '金币路块', cost: 30, color: '#ffd54f', dark: '#c99a2e',
    gold: 2, desc: '金币路块：产生可走边，敌人每经过一次获得 2 金币'
  },
  bridge: {
    name: '桥路块', cost: 40, color: '#81d4fa', dark: '#4fc3f7',
    desc: '桥路块：敌人可沿桥边行走，也可从一条边直穿到对边'
  }
}

// ===== 武器（安放在格子边上，攻击经过的敌人）=====
// 射程单位为"格"（地图 10x8 格）：箭塔最远（狙击位）、炮塔最短（贴脸溅射）、冰/毒中等（支援位）
// antiAir=true 的武器才能攻击飞行怪（直线飞行的敌人）
export const WEAPON_TYPES = {
  arrow: {
    name: '箭塔', cost: 50, range: 4.5, damage: 16, fireRate: 2.5,
    antiAir: true, color: '#ff4d6d', desc: '射程最远(4.5格)、射速快，单体高伤，可对空'
  },
  cannon: {
    name: '炮塔', cost: 100, range: 2.5, damage: 40, fireRate: 0.8,
    splash: 1.2, color: '#9aa4b5', desc: '范围爆炸(1.2格)，射程短，克制成群小怪'
  },
  ice: {
    name: '冰塔', cost: 75, range: 3.5, damage: 10, fireRate: 1.5,
    slow: 0.45, slowDur: 2.5, color: '#00e5ff', desc: '命中减速45%，射程中等，辅助控场'
  },
  poison: {
    name: '毒塔', cost: 90, range: 3.5, damage: 12, fireRate: 1.5,
    poison: 18, poisonDur: 3.5, color: '#66bb6a', desc: '命中持续中毒，克制高血量敌人'
  },
  laser: {
    name: '激光炮', cost: 90, range: 4, damage: 30, fireRate: 2,
    antiAir: true, color: '#ff2bd6',
    unlock: { kills: 40 }, desc: '高射速激光，可对空（解锁：累计击杀 40）'
  },
  missile: {
    name: '导弹塔', cost: 130, range: 6, damage: 55, fireRate: 0.6,
    splash: 1.5, antiAir: true, color: '#ff9f43',
    unlock: { wave: 6 }, desc: '超远程溅射，可对空（解锁：到达第 6 波）'
  }
}

// ===== 防具（安放在格子边上，阻挡/削弱敌人）=====
export const ARMOR_TYPES = {
  slow: {
    name: '减速带', cost: 40, slow: 0.5, slowDur: 2.5,
    color: '#b388ff', desc: '经过的敌人被减速 2.5 秒'
  },
  barricade: {
    name: '路障', cost: 60, stun: 1.5,
    color: '#ff9f43', desc: '经过的敌人被阻挡 1.5 秒'
  }
}

// ===== 陷阱（放在边上，敌人经过时被动触发，与武器/防具互斥）=====
export const TRAP_TYPES = {
  spike: {
    name: '地刺', cost: 30, damage: 40, cooldown: 3,
    color: '#ff7043', desc: '敌人经过时被刺伤，需充能 3 秒'
  },
  tesla: {
    name: '电击网', cost: 50, damage: 15, stun: 0.4, cooldown: 1.5,
    color: '#00e5ff', desc: '敌人经过时受电击并麻痹，充能 1.5 秒'
  },
  mine: {
    name: '地雷', cost: 45, damage: 90, oneShot: true,
    color: '#ff1744', unlock: { kills: 25 }, desc: '一次性高伤陷阱，触发后消失（解锁：累计击杀 25）'
  }
}

// ===== 传送门（成对放在两条边上，敌人进 A 门从 B 门出来）=====
export const PORTAL_TYPES = {
  portal: {
    name: '传送门', cost: 80,
    color: '#b388ff', desc: '成对放置，敌人进入一个门从另一个门出来'
  }
}

// ===== 敌人类型 =====
export const ENEMY_TYPES = {
  grunt:   { name: '小兵',   hp: 90,  speed: 1.0, reward: 5,   color: '#ff4d6d', radius: 8 },
  runner:  { name: '疾行者', hp: 55,  speed: 1.8, reward: 7,   color: '#ff9f43', radius: 6 },
  tank:    { name: '坦克',   hp: 320, speed: 0.6, reward: 15,  color: '#9aa4b5', radius: 11 },
  flyer:   { name: '飞行者', hp: 90,  speed: 1.4, reward: 12,  color: '#2ee6a8', radius: 7, flying: true },
  boss:    { name: 'Boss',   hp: 2400, speed: 0.5, reward: 100, color: '#b388ff', radius: 14 },
  mini:    { name: '分裂体', hp: 40,  speed: 1.2, reward: 2,   color: '#ff8a80', radius: 5 },
  splitter:{ name: '分裂怪', hp: 130, speed: 1.0, reward: 8,   color: '#ff7043', radius: 9, split: 2 },
  bomber:  { name: '自爆怪', hp: 70,  speed: 1.3, reward: 6,   color: '#ff1744', radius: 7, explode: true },
  stealth: { name: '隐形怪', hp: 100, speed: 1.1, reward: 9,   color: '#7c4dff', radius: 7, stealth: true },
  healer:  { name: '治疗怪', hp: 130, speed: 0.9, reward: 12,  color: '#00c853', radius: 9, heal: 6 }
}

// ===== 武器升级：level 1→2→3 的升级费用 =====
export const UPGRADE_COSTS = {
  arrow:  [0, 60, 120],
  cannon: [0, 110, 200],
  ice:    [0, 80, 150],
  poison: [0, 90, 160],
  laser:  [0, 90, 170],
  missile:[0, 140, 240]
}

// 按等级计算武器实际属性（level 1/2/3）
// Lv.3 解锁特殊能力：箭塔穿透 / 炮塔连环爆炸 / 冰塔范围冻结 / 毒塔传染扩散
export function weaponStats(type, level) {
  const def = WEAPON_TYPES[type]
  const lv = Math.max(1, Math.min(level || 1, 3))
  const dmgMult = [1, 1.5, 2.2][lv - 1]
  const st = {
    range: def.range + (lv - 1) * 0.5,
    damage: Math.round(def.damage * dmgMult),
    fireRate: def.fireRate * (1 + (lv - 1) * 0.2),
    splash: def.splash || 0,
    slow: def.slow || 0,
    slowDur: def.slowDur || 0,
    poison: def.poison || 0,
    poisonDur: def.poisonDur || 0,
    antiAir: !!def.antiAir
  }
  if (type === 'arrow' && lv === 3) st.pierce = 2
  if (type === 'cannon' && lv === 3) st.chain = true
  if (type === 'ice' && lv === 3) st.freeze = 1.2
  if (type === 'poison' && lv === 3) st.spread = 0.8
  return st
}

// ===== 波次生成：返回 [{ t, type }] 时间轴 =====
export function generateWave(n) {
  const events = []
  let t = 0
  const hpScale = 1 + (n - 1) * 0.12

  const grunts = 4 + n * 2
  for (let i = 0; i < grunts; i++) {
    events.push({ t, type: 'grunt', hpScale })
    t += Math.max(0.35, 0.85 - n * 0.02)
  }
  if (n >= 2) {
    const runners = 2 + Math.floor(n * 0.8)
    for (let i = 0; i < runners; i++) {
      events.push({ t, type: 'runner', hpScale })
      t += 0.5
    }
  }
  if (n >= 3) {
    const tanks = 1 + Math.floor((n - 2) * 0.6)
    for (let i = 0; i < tanks; i++) {
      events.push({ t, type: 'tank', hpScale })
      t += 1.6
    }
  }
  if (n >= 4) {
    const flyers = 2 + Math.floor((n - 3) * 0.7)
    for (let i = 0; i < flyers; i++) {
      events.push({ t, type: 'flyer', hpScale })
      t += 0.6
    }
  }
  if (n >= 3) {
    const stealths = 1 + Math.floor((n - 2) * 0.5)
    for (let i = 0; i < stealths; i++) {
      events.push({ t, type: 'stealth', hpScale })
      t += 0.7
    }
  }
  if (n >= 4) {
    const splitters = 1 + Math.floor((n - 3) * 0.5)
    for (let i = 0; i < splitters; i++) {
      events.push({ t, type: 'splitter', hpScale })
      t += 0.9
    }
  }
  if (n >= 5) {
    const bombers = 1 + Math.floor((n - 4) * 0.4)
    for (let i = 0; i < bombers; i++) {
      events.push({ t, type: 'bomber', hpScale })
      t += 1.2
    }
  }
  if (n >= 6) {
    const healers = 1 + Math.floor((n - 5) * 0.3)
    for (let i = 0; i < healers; i++) {
      events.push({ t, type: 'healer', hpScale })
      t += 1.4
    }
  }
  if (n % 5 === 0) {
    events.push({ t: t + 1.5, type: 'boss', hpScale })
  }
  return events
}

// 波次通关奖励
export function waveBonus(n) {
  return 20 + n * 5
}
