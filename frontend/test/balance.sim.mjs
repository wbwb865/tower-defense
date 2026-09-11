// 平衡性模拟：自动建塔+升级打满 15 波，检查是否可通关（node test/balance.sim.mjs）
import { GameEngine } from '../src/game/engine.js'
import { WEAPON_TYPES, UPGRADE_COSTS, TOTAL_WAVES } from '../src/game/config.js'

// 三张地图：尺寸/出入口/初始资源/差异化配置/候选塔位
const MAPS = [
  {
    name: '新手平原', width: 14, height: 12, spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 120, lives: 20, config: undefined,
    spots: [
      { dir: 'v', x: 0, y: 1 }, { dir: 'v', x: 0, y: 10 },
      { dir: 'h', x: 7, y: 0 }, { dir: 'h', x: 7, y: 12 },
      { dir: 'v', x: 14, y: 1 }, { dir: 'v', x: 14, y: 10 },
      { dir: 'h', x: 3, y: 0 }, { dir: 'h', x: 11, y: 0 },
      { dir: 'h', x: 3, y: 12 }, { dir: 'h', x: 11, y: 12 },
      { dir: 'v', x: 0, y: 5 }, { dir: 'v', x: 14, y: 5 },
      { dir: 'v', x: 0, y: 7 }, { dir: 'v', x: 14, y: 7 },
    ]
  },
  {
    name: '峡谷险道', width: 16, height: 13, spawn: { x: 0, y: 6 }, exit: { x: 16, y: 6 },
    startGold: 150, lives: 18,
    config: { terrain: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 7, y: 1 }, { x: 8, y: 1 }, { x: 9, y: 1 }, { x: 12, y: 2 }, { x: 13, y: 2 }, { x: 14, y: 2 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 7, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 5, y: 6 }, { x: 10, y: 6 }] },
    spots: [
      { dir: 'v', x: 0, y: 1 }, { dir: 'v', x: 0, y: 11 },
      { dir: 'h', x: 8, y: 0 }, { dir: 'h', x: 8, y: 13 },
      { dir: 'v', x: 16, y: 1 }, { dir: 'v', x: 16, y: 11 },
      { dir: 'h', x: 3, y: 0 }, { dir: 'h', x: 13, y: 0 },
      { dir: 'h', x: 3, y: 13 }, { dir: 'h', x: 13, y: 13 },
      { dir: 'v', x: 0, y: 5 }, { dir: 'v', x: 16, y: 5 },
      { dir: 'v', x: 0, y: 7 }, { dir: 'v', x: 16, y: 7 },
    ]
  },
  {
    name: '十字要塞', width: 15, height: 15, spawn: { x: 7, y: 0 }, exit: { x: 7, y: 15 },
    startGold: 160, lives: 15,
    config: {
      terrain: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 }, { x: 3, y: 8 }, { x: 3, y: 9 }, { x: 2, y: 7 }, { x: 4, y: 7 }, { x: 11, y: 5 }, { x: 11, y: 6 }, { x: 11, y: 7 }, { x: 11, y: 8 }, { x: 11, y: 9 }, { x: 10, y: 7 }, { x: 12, y: 7 }],
      enemyMod: { hp: 1.3, reward: 1.3 },
      weaponBan: ['missile']
    },
    spots: [
      { dir: 'h', x: 6, y: 0 }, { dir: 'h', x: 8, y: 0 },
      { dir: 'h', x: 6, y: 15 }, { dir: 'h', x: 8, y: 15 },
      { dir: 'v', x: 0, y: 2 }, { dir: 'v', x: 15, y: 2 },
      { dir: 'v', x: 0, y: 5 }, { dir: 'v', x: 15, y: 5 },
      { dir: 'v', x: 0, y: 7 }, { dir: 'v', x: 15, y: 7 },
      { dir: 'v', x: 0, y: 9 }, { dir: 'v', x: 15, y: 9 },
      { dir: 'v', x: 0, y: 12 }, { dir: 'v', x: 15, y: 12 },
      { dir: 'h', x: 3, y: 0 }, { dir: 'h', x: 11, y: 0 },
      { dir: 'h', x: 3, y: 15 }, { dir: 'h', x: 11, y: 15 },
    ]
  }
]

function tryUpgrade(eng) {
  // 优先升级箭塔（防空骨干）到 Lv.3，再升级其他（防空不足时飞行怪会漏）
  let best = null
  let bestCost = Infinity
  let bestPriority = 2
  for (const [key, s] of eng.structures) {
    if (s.kind !== 'weapon' || s.level >= 3) continue
    const cost = UPGRADE_COSTS[s.type][s.level]
    const priority = s.type === 'arrow' ? 0 : 1
    if (priority < bestPriority || (priority === bestPriority && cost < bestCost)) {
      bestPriority = priority
      bestCost = cost
      best = { key, s }
    }
  }
  if (best && eng.gold >= bestCost) {
    eng.upgradeStructure(eng.graph.parseEdgeKey(best.key))
    return true
  }
  return false
}

function firstFree(eng, spots) {
  for (const spot of spots) {
    const key = eng.graph.edgeKey(spot)
    if (!eng.structures.has(key)) return spot
  }
  return null
}

function arrowCount(eng) {
  let n = 0
  for (const s of eng.structures.values()) if (s.kind === 'weapon' && s.type === 'arrow') n++
  return n
}

function sim(map, strategy) {
  const eng = new GameEngine({ ...map, config: map.config })
  const spots = map.spots
  // 防空位：靠近飞行路径（生成→终点直线）的候选边
  const vertical = map.spawn.x === map.exit.x
  const path = vertical ? map.spawn.x : map.spawn.y
  const aaSpots = spots.filter((s) => {
    const mid = eng.graph.edgeMidpoint(s)
    return Math.abs((vertical ? mid.x : mid.y) - path) <= 1.5
  })
  let guard = 0
  while (eng.state !== 'win' && eng.state !== 'over' && guard < 200000) {
    guard++
    if (eng.state === 'build') {
      const action = strategy(eng, spots, aaSpots)
      if (action) {
        const r = eng.placeStructure(action.edge, 'weapon', action.type)
        if (r.ok) continue
      }
      if (tryUpgrade(eng)) continue
      eng.startWave()
    }
    eng.update(1 / 60)
  }
  return { state: eng.state, maxWave: eng.wave, minLives: eng.lives, gold: eng.gold, towers: eng.structures.size, kills: eng.kills }
}

// 策略A：纯箭塔，铺满候选位并升级
const strategyArrow = (eng, spots) => {
  if (eng.gold < WEAPON_TYPES.arrow.cost) return null
  const spot = firstFree(eng, spots)
  return spot ? { edge: spot, type: 'arrow' } : null
}

// 策略B：箭塔防空骨干 + 炮塔主力，升级
const strategyMix = (eng, spots, aaSpots) => {
  const arrow = WEAPON_TYPES.arrow
  const cannon = WEAPON_TYPES.cannon
  // 保证至少 6 座箭塔防空
  if (arrowCount(eng) < 6) {
    if (eng.gold < arrow.cost) return null
    const spot = firstFree(eng, aaSpots) || firstFree(eng, spots)
    return spot ? { edge: spot, type: 'arrow' } : null
  }
  const wantCannon = eng.wave >= 3
  const def = wantCannon ? cannon : arrow
  if (eng.gold < def.cost) return null
  const spot = firstFree(eng, spots)
  return spot ? { edge: spot, type: wantCannon ? 'cannon' : 'arrow' } : null
}

// 策略C：箭塔防空骨干 + 冰塔/毒塔辅助，升级
const strategySupport = (eng, spots, aaSpots) => {
  const arrow = WEAPON_TYPES.arrow
  const ice = WEAPON_TYPES.ice
  const poison = WEAPON_TYPES.poison
  if (arrowCount(eng) < 6) {
    if (eng.gold < arrow.cost) return null
    const spot = firstFree(eng, aaSpots) || firstFree(eng, spots)
    return spot ? { edge: spot, type: 'arrow' } : null
  }
  const n = eng.structures.size
  let type = 'arrow'
  if (n % 3 === 1) type = 'ice'
  else if (n % 3 === 2) type = 'poison'
  const def = type === 'arrow' ? arrow : type === 'ice' ? ice : poison
  if (eng.gold < def.cost) return null
  const spot = firstFree(eng, spots)
  return spot ? { edge: spot, type } : null
}

for (const map of MAPS) {
  console.log(`\n=== ${map.name} (${map.width}x${map.height}) ===`)
  for (const [name, fn] of [['纯箭塔', strategyArrow], ['箭+炮', strategyMix], ['箭+冰+毒', strategySupport]]) {
    const r = sim(map, fn)
    console.log(`${name}: ${r.state} 波次=${r.maxWave}/${TOTAL_WAVES} 最低生命=${r.minLives} 塔数=${r.towers} 金币=${r.gold} 击杀=${r.kills}`)
  }
}
