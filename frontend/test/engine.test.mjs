// 游戏引擎逻辑测试（node test/engine.test.mjs）
import { GameEngine } from '../src/game/engine.js'
import { weaponStats, CELL } from '../src/game/config.js'

let failures = 0
function assert(cond, msg) {
  if (cond) {
    console.log('PASS:', msg)
  } else {
    console.error('FAIL:', msg)
    failures++
  }
}

function makeEngine() {
  return new GameEngine({ width: 10, height: 8, spawn: { x: 0, y: 4 }, exit: { x: 10, y: 4 }, startGold: 120, lives: 20 })
}

// 1. 生成/终点各两条平行线，与边界垂直（左生成 → 上下两条水平线）
{
  const eng = makeEngine()
  assert(eng.spawnLines.length === 2, '生成线有两条')
  assert(eng.graph.edgeKey(eng.spawnLines[0]) === 'h:-1,4', `生成线 1 为 h:-1,4（实际 ${eng.graph.edgeKey(eng.spawnLines[0])}）`)
  assert(eng.graph.edgeKey(eng.spawnLines[1]) === 'h:-1,5', `生成线 2 为 h:-1,5（实际 ${eng.graph.edgeKey(eng.spawnLines[1])}）`)
  assert(eng.exitLines.length === 2, '终点线有两条')
  assert(eng.graph.edgeKey(eng.exitLines[0]) === 'h:10,4', `终点线 1 为 h:10,4（实际 ${eng.graph.edgeKey(eng.exitLines[0])}）`)
  assert(eng.graph.edgeKey(eng.exitLines[1]) === 'h:10,5', `终点线 2 为 h:10,5（实际 ${eng.graph.edgeKey(eng.exitLines[1])}）`)
}

// 2. 默认外圈路径存在：上下两条车道贪心可达终点，且走相反的路
{
  const eng = makeEngine()
  assert(eng.hasValidPath(), '默认两条车道均有贪心通路')
  const targets = eng.laneTargets()
  const top = eng.graph.greedyPath(eng.cells, eng.spawnLines[0], targets[0])
  const bottom = eng.graph.greedyPath(eng.cells, eng.spawnLines[1], targets[1])
  assert(top !== null && bottom !== null, '上下车道贪心路径均存在')
  const topPoints = eng.graph.edgePathToPoints(top)
  const bottomPoints = eng.graph.edgePathToPoints(bottom)
  assert(topPoints.some((p) => p.y === 0), '上车道沿上边界走')
  assert(bottomPoints.some((p) => p.y === 8), '下车道沿下边界走')
  assert(topPoints[topPoints.length - 1].y < bottomPoints[bottomPoints.length - 1].y, '上车道从上方终点离开、下车道从下方终点离开')
}

// 3. 重叠边不可走：边界路块与外圈重叠的边封闭，非重叠边可走
{
  const eng = makeEngine()
  const r = eng.placeBlock(5, 0, 'path')
  assert(r.ok, '边界路块可放置（敌人绕行）')
  const g = eng.graph
  assert(!g.edgeWalkable(eng.cells, { dir: 'h', x: 5, y: 0 }), '路块与外圈重叠的顶边不可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'h', x: 5, y: 1 }), '路块非重叠的底边可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'v', x: 5, y: 0 }), '路块非重叠的左边可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'v', x: 6, y: 0 }), '路块非重叠的右边可走')
}

// 4. 两路块重叠的边不可走
{
  const eng = makeEngine()
  eng.placeBlock(5, 0, 'path')
  eng.placeBlock(6, 0, 'path')
  const g = eng.graph
  assert(!g.edgeWalkable(eng.cells, { dir: 'v', x: 6, y: 0 }), '两路块重叠的边不可走')
}

// 5. 孤立路块无法放置（需与墙壁或其他路块相邻）
{
  const eng = makeEngine()
  const r = eng.placeBlock(5, 4, 'path')
  assert(!r.ok, '孤立路块无法放置')
  assert(eng.cells[eng.graph.cellIndex(5, 4)] === null, '孤立路块未写入地图')
}

// 6. 与已有路块相邻可放置
{
  const eng = makeEngine()
  const r1 = eng.placeBlock(5, 0, 'path')
  const r2 = eng.placeBlock(6, 0, 'path')
  assert(r1.ok && r2.ok, '边界路块与相邻路块均可放置')
}

// 7. 堵死某条车道的放置被拒绝
// 右侧 (9,3)(9,4) 封住上出口；再放 (9,5) 会同时封死上下出口 → 上车道无路可走
{
  const eng = makeEngine()
  assert(eng.placeBlock(9, 3, 'path').ok, '右侧上部路块可放置')
  assert(eng.placeBlock(9, 4, 'path').ok, '右侧中部路块可放置')
  const r = eng.placeBlock(9, 5, 'path')
  assert(!r.ok, '堵死出口车道的放置被拒绝')
  assert(eng.cells[eng.graph.cellIndex(9, 5)] === null, '被拒绝的放置未写入地图')
}

// 8. 敌人从生成线出生
{
  const eng = makeEngine()
  eng.startWave()
  let spawned = null
  let guard = 0
  while (!spawned && guard < 600) {
    eng.update(1 / 60)
    guard++
    if (eng.enemies.length) spawned = eng.enemies[0]
  }
  assert(spawned, '敌人已生成')
  const onSpawnLine = eng.spawnLines.some((e) => eng.graph.edgeKey(e) === spawned.currentEdgeKey)
  assert(onSpawnLine, `敌人沿生成线出生（当前边 ${spawned.currentEdgeKey}）`)
}

// 9. 完整波次：敌人沿车道走到出口扣生命，波次结束发奖励
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (eng.state === 'wave' && guard < 6000) {
    eng.update(1 / 60)
    guard++
  }
  assert(eng.state === 'build', '第 1 波正常结束')
  assert(eng.lives === 14, `第 1 波 6 个敌人漏掉后生命为 14（实际 ${eng.lives}）`)
  assert(eng.gold === 145, `波次奖励后金币为 145（实际 ${eng.gold}）`)
}

// 10. 武器击杀敌人并获取金币（上下车道各一座箭塔）
{
  const eng = makeEngine()
  const r1 = eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'arrow')
  const r2 = eng.placeStructure({ dir: 'v', x: 10, y: 6 }, 'weapon', 'arrow')
  assert(r1.ok && r2.ok, '两座箭塔放置成功')
  eng.startWave()
  let guard = 0
  while (eng.state === 'wave' && guard < 6000) {
    eng.update(1 / 60)
    guard++
  }
  assert(eng.kills === 6, `箭塔击杀全部 6 个敌人（实际 ${eng.kills}）`)
}

// 11. 拆除返还金币（100%）
{
  const eng = makeEngine()
  const g0 = eng.gold
  const r = eng.placeBlock(0, 7, 'path')
  assert(r.ok, '路块可放置')
  eng.removeBlock(0, 7)
  assert(eng.gold === g0, `拆除路块返还 100%（实际 ${eng.gold}，期望 ${g0}）`)
}

// 12. 金币路块产生收益（下车道敌人经过其两条边）
{
  const eng = makeEngine()
  const r = eng.placeBlock(0, 7, 'gold')
  assert(r.ok, '金币路块可放置')
  eng.startWave()
  let guard = 0
  while (eng.state === 'wave' && guard < 6000) {
    eng.update(1 / 60)
    guard++
  }
  assert(eng.gold === 127, `金币路块产生收益 127（实际 ${eng.gold}）`)
}

// 13. 生成/终点线不可放置设施
{
  const eng = makeEngine()
  const r = eng.placeStructure({ dir: 'h', x: -1, y: 4 }, 'weapon', 'arrow')
  assert(!r.ok, '生成线不可放置设施')
}

// 14. 拆除导致其他路块悬空 → 禁止
{
  const eng = makeEngine()
  assert(eng.placeBlock(5, 0, 'path').ok, '边界路块可放置')
  assert(eng.placeBlock(5, 1, 'path').ok, '相邻路块可放置')
  const r = eng.removeBlock(5, 0)
  assert(!r.ok, '拆除后 (5,1) 悬空，禁止拆除')
  assert(eng.cells[eng.graph.cellIndex(5, 0)] === 'path', '被禁止的拆除未生效')
}

// 15. 拆除导致武器悬空 → 禁止
{
  const eng = makeEngine()
  assert(eng.placeBlock(5, 0, 'path').ok, '路块可放置')
  assert(eng.placeStructure({ dir: 'h', x: 5, y: 1 }, 'weapon', 'arrow').ok, '武器可放置在可走边')
  const r = eng.removeBlock(5, 0)
  assert(!r.ok, '拆除后武器悬空，禁止拆除')
  assert(eng.cells[eng.graph.cellIndex(5, 0)] === 'path', '被禁止的拆除未生效')
}

// 16. 拆除导致整组路块与墙壁断开（悬空孤岛）→ 禁止
{
  const eng = makeEngine()
  for (const [cx, cy] of [[5, 0], [5, 1], [5, 2], [6, 2], [6, 3], [5, 3]]) {
    assert(eng.placeBlock(cx, cy, 'path').ok, `路块 (${cx},${cy}) 可放置`)
  }
  const r = eng.removeBlock(5, 1)
  assert(!r.ok, '拆除后下方方块组与墙壁断开，禁止拆除')
  assert(eng.cells[eng.graph.cellIndex(5, 1)] === 'path', '被禁止的拆除未生效')
}

// 17. 组内安全拆除仍允许（返还 100%）
{
  const eng = makeEngine()
  for (const [cx, cy] of [[5, 0], [6, 0], [6, 1], [5, 1]]) {
    assert(eng.placeBlock(cx, cy, 'path').ok, `路块 (${cx},${cy}) 可放置`)
  }
  const gBefore = eng.gold
  const r = eng.removeBlock(6, 0)
  assert(r.ok, '不导致悬空的拆除允许执行')
  assert(eng.gold === gBefore + 10, `拆除返还 100%（实际 ${eng.gold}，期望 ${gBefore + 10}）`)
}

// 18. 目标死亡后弹幕不立即清除，继续飞向目标最后位置
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'v', x: 0, y: 3 }, 'weapon', 'arrow')
  eng.startWave()
  let p = null
  let guard = 0
  while (guard < 600) {
    eng.update(1 / 60)
    guard++
    if (eng.projectiles.length && Math.hypot(eng.projectiles[0].x - eng.projectiles[0].target.x, eng.projectiles[0].y - eng.projectiles[0].target.y) > 1) {
      p = eng.projectiles[0]
      break
    }
  }
  assert(p, '弹幕在飞行中')
  eng.damageEnemy(p.target, p.target.hp)
  assert(p.target.dead, '目标已死亡')
  const before = { x: p.x, y: p.y }
  eng.update(1 / 60)
  assert(eng.projectiles.includes(p), '目标死亡后弹幕未被立即清除')
  assert(Math.hypot(p.x - before.x, p.y - before.y) > 0, '弹幕继续飞向目标最后位置')
}

// 19. 地刺陷阱：敌人经过时触发伤害并进入充能
{
  const eng = makeEngine()
  const r = eng.placeStructure({ dir: 'h', x: 5, y: 8 }, 'trap', 'spike')
  assert(r.ok, '地刺可放置在可走边')
  eng.startWave()
  let guard = 0
  let hit = false
  while (guard < 3000) {
    eng.update(1 / 60)
    guard++
    for (const e of eng.enemies) {
      if (e.currentEdgeKey === 'h:5,8' && e.hp < e.maxHp) hit = true
    }
    if (hit) break
  }
  assert(hit, '敌人经过地刺时受到伤害')
}

// 20. 传送门：成对配对，敌人进入后传送到另一门
// 注：B 门选在顶部边界 H(0,0)（而非左边界 V(0,1)），因为生成线之间的 gap 边 V(0,4) 已禁用，
// 左边界下方无法贪心到达目标，传送会因无路可走而失败
{
  const eng = makeEngine()
  eng.gold = 200
  assert(eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'portal', 'portal').ok, '传送门 A 放置成功')
  assert(eng.placeStructure({ dir: 'h', x: 0, y: 0 }, 'portal', 'portal').ok, '传送门 B 放置成功')
  const sA = eng.structures.get('v:10,1')
  const sB = eng.structures.get('h:0,0')
  assert(sA.pair === 'h:0,0' && sB.pair === 'v:10,1', '两个传送门自动配对')
  const e = { x: 10.5, y: 1.5, target: { x: 10, y: 4.5 }, teleportCooldown: 0 }
  eng.teleportEnemy(e, sA)
  assert(e.x === 0.5 && e.y === 0, `敌人被传送到 B 门位置（实际 ${e.x},${e.y}）`)
}

// 21. 塔升级：提升等级与属性，满级不可再升
{
  const eng = makeEngine()
  eng.gold = 500
  eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'arrow')
  const r1 = eng.upgradeStructure({ dir: 'v', x: 10, y: 1 })
  assert(r1.ok && r1.level === 2, '升级到 Lv.2')
  const st2 = weaponStats('arrow', 2)
  assert(st2.damage === 24, `Lv.2 箭塔伤害 24（实际 ${st2.damage}）`)
  const r2 = eng.upgradeStructure({ dir: 'v', x: 10, y: 1 })
  assert(r2.ok && r2.level === 3, '升级到 Lv.3')
  const r3 = eng.upgradeStructure({ dir: 'v', x: 10, y: 1 })
  assert(!r3.ok, '满级不可再升级')
}

// 22. 飞行怪：无视路块，从生成点直线飞向终点线中点
{
  const eng = makeEngine()
  eng.spawnEnemy('flyer')
  const e = eng.enemies[eng.enemies.length - 1]
  assert(e.flying === true, '飞行怪 flying 标志为 true')
  assert(e.currentEdgeKey === null, '飞行怪不沿边行走（currentEdgeKey 为 null）')
  assert(e.path.length === 2, `飞行怪路径为直线两点（实际 ${e.path.length} 点）`)
  const exitMid = eng.graph.edgeMidpoint(eng.exitLines[0])
  const end = e.path[1]
  assert(Math.hypot(end.x - exitMid.x, end.y - exitMid.y) < 0.01, '飞行怪终点为终点线中点')
}

// 23. 防空：非防空武器不能攻击飞行怪，防空武器可以
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'cannon')
  const flyer = {
    id: 995, type: 'flyer', hp: 90, maxHp: 90, reward: 12, color: '#2ee6a8', radius: 7,
    immuneSlow: false, split: 0, explode: false, stealth: false, heal: 0, flying: true,
    x: 10.5, y: 1.5, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(flyer)
  eng.updateWeapons(1 / 60)
  assert(eng.projectiles.length === 0, '非防空武器（炮塔）不攻击飞行怪')
}
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'arrow')
  const flyer = {
    id: 995, type: 'flyer', hp: 90, maxHp: 90, reward: 12, color: '#2ee6a8', radius: 7,
    immuneSlow: false, split: 0, explode: false, stealth: false, heal: 0, flying: true,
    x: 10.5, y: 1.5, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(flyer)
  eng.updateWeapons(1 / 60)
  assert(eng.projectiles.length === 1, '防空武器（箭塔）攻击飞行怪')
}

// 24. 隐藏设施解锁：按累计击杀/波次条件解锁
{
  const eng = makeEngine()
  assert(!eng.isUnlocked('weapon', 'laser'), '激光炮初始未解锁（击杀 0 < 40）')
  assert(!eng.isUnlocked('weapon', 'missile'), '导弹塔初始未解锁（波次 0 < 6）')
  assert(!eng.isUnlocked('trap', 'mine'), '地雷初始未解锁（击杀 0 < 25）')
  eng.kills = 40
  assert(eng.isUnlocked('weapon', 'laser'), '累计击杀 40 解锁激光炮')
  assert(eng.isUnlocked('trap', 'mine'), '累计击杀 40 同时解锁地雷')
  eng.wave = 6
  assert(eng.isUnlocked('weapon', 'missile'), '到达第 6 波解锁导弹塔')
  assert(eng.isUnlocked('weapon', 'arrow'), '无解锁条件的武器始终可用')
}

// 25. 地雷：一次性高伤陷阱，触发后消失
{
  const eng = makeEngine()
  eng.gold = 200
  eng.kills = 25
  const r = eng.placeStructure({ dir: 'h', x: 5, y: 8 }, 'trap', 'mine')
  assert(r.ok, '地雷可放置在可走边')
  const e = {
    id: 994, type: 'grunt', hp: 90, maxHp: 90, reward: 5, color: '#ff4d6d', radius: 8,
    immuneSlow: false, split: 0, explode: false, stealth: false, heal: 0,
    x: 5.5, y: 8, path: null, pathIndex: 0, currentEdgeKey: 'h:5,8', target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(e)
  eng.triggerTrap(e, eng.structures.get('h:5,8'))
  assert(e.dead, '地雷 90 伤害击杀敌人')
  assert(!eng.structures.has('h:5,8'), '地雷触发后消失（一次性）')
}

// 26. 满级特殊能力：箭塔穿透 / 炮塔连环 / 冰塔冻结 / 毒塔扩散
{
  assert(weaponStats('arrow', 3).pierce === 2, '箭塔 Lv.3 穿透 2 个额外敌人')
  assert(weaponStats('cannon', 3).chain === true, '炮塔 Lv.3 连环爆炸')
  assert(weaponStats('ice', 3).freeze === 1.2, '冰塔 Lv.3 范围冻结 1.2 格')
  assert(weaponStats('poison', 3).spread === 0.8, '毒塔 Lv.3 传染扩散 0.8 格')
}

// 24. 分裂怪死亡后分裂成小怪
{
  const eng = makeEngine()
  const e = {
    id: 999, type: 'splitter', hp: 130, maxHp: 130, reward: 8, color: '#ff7043', radius: 9,
    immuneSlow: false, split: 2, explode: false, stealth: false, heal: 0,
    x: 5, y: 4, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(e)
  eng.damageEnemy(e, 999)
  assert(e.dead, '分裂怪死亡')
  const minis = eng.enemies.filter((m) => m.type === 'mini')
  assert(minis.length === 2, `分裂出 2 个小怪（实际 ${minis.length}）`)
}

// 25. 隐形怪：有武器在范围内时被侦测
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'arrow')
  const e1 = { x: 10.5, y: 1.5, type: 'stealth', dead: false, reachedExit: false }
  assert(eng.isStealthRevealed(e1), '隐形怪在武器射程内被侦测')
  const e2 = { x: 0.5, y: 7.5, type: 'stealth', dead: false, reachedExit: false }
  assert(!eng.isStealthRevealed(e2), '远离武器的隐形怪不可见')
}

// 26. 自爆怪靠近设施时摧毁设施
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'v', x: 10, y: 1 }, 'weapon', 'arrow')
  const b = {
    id: 998, type: 'bomber', hp: 70, maxHp: 70, reward: 6, color: '#ff1744', radius: 7,
    immuneSlow: false, split: 0, explode: true, stealth: false, heal: 0,
    x: 10.5, y: 1.5, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(b)
  eng.updateBombers(1 / 60)
  assert(!eng.structures.has('v:10,1'), '自爆怪摧毁了设施')
  assert(b.dead, '自爆怪自爆死亡')
}

// 27. 治疗怪为周围敌人回血
{
  const eng = makeEngine()
  const healer = {
    id: 997, type: 'healer', hp: 150, maxHp: 150, reward: 12, color: '#00c853', radius: 9,
    immuneSlow: false, split: 0, explode: false, stealth: false, heal: 12,
    x: 5, y: 4, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  const wounded = {
    id: 996, type: 'grunt', hp: 50, maxHp: 90, reward: 5, color: '#ff4d6d', radius: 8,
    immuneSlow: false, split: 0, explode: false, stealth: false, heal: 0,
    x: 5.5, y: 4, path: null, pathIndex: 0, currentEdgeKey: null, target: { x: 10, y: 4.5 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  }
  eng.enemies.push(healer, wounded)
  eng.updateHealers(1)
  assert(wounded.hp > 50, `治疗怪为同伴回血（实际 ${wounded.hp}）`)
}

// 28. 电击网：敌人经过时被麻痹
{
  const eng = makeEngine()
  eng.placeStructure({ dir: 'h', x: 5, y: 8 }, 'trap', 'tesla')
  eng.startWave()
  let guard = 0
  let stunned = false
  while (guard < 3000) {
    eng.update(1 / 60)
    guard++
    for (const e of eng.enemies) {
      if (e.currentEdgeKey === 'h:5,8' && e.stunTimer > 0) stunned = true
    }
    if (stunned) break
  }
  assert(stunned, '敌人经过电击网被麻痹')
}

// 29. structureNear：点击武器位置能定位到其所在边（修复拆除/升级点不中 bug）
{
  const eng = makeEngine()
  eng.gold = 500
  eng.placeBlock(5, 0, 'path')
  eng.placeStructure({ dir: 'h', x: 5, y: 1 }, 'weapon', 'arrow')
  // 武器画在边中点 (5.5, 1) → 像素 (5.5*CELL, 1*CELL)
  const skey = eng.structureNear(5.5 * CELL, 1 * CELL)
  assert(skey === 'h:5,1', `点击武器中点定位到 h:5,1（实际 ${skey}）`)
  // 点击路块中心附近不应命中设施
  const skey2 = eng.structureNear(5.5 * CELL, 0.5 * CELL)
  assert(skey2 === null, `点击路块中心不命中设施（实际 ${skey2}）`)
  // 通过 structureNear 拆除武器后，路块可正常拆除
  const r1 = eng.removeStructure(eng.graph.parseEdgeKey(skey))
  assert(r1.ok, '拆除武器成功')
  const r2 = eng.removeBlock(5, 0)
  assert(r2.ok, '拆除武器后路块可正常拆除')
}

// 30. 升级模式：点击武器位置能正确升级（修复节点平局歧义）
{
  const eng = makeEngine()
  eng.gold = 500
  eng.placeBlock(5, 0, 'path')
  eng.placeStructure({ dir: 'h', x: 5, y: 1 }, 'weapon', 'arrow')
  const skey = eng.structureNear(5.5 * CELL, 1 * CELL)
  const r = eng.upgradeStructure(eng.graph.parseEdgeKey(skey))
  assert(r.ok && r.level === 2, '点击武器中点可正常升级到 Lv.2')
}

// 31. 格子边上已有武器/防具时不能放置路块（防止设施悬空）
{
  const eng = makeEngine()
  eng.gold = 500
  eng.placeBlock(5, 0, 'path')
  eng.placeStructure({ dir: 'h', x: 5, y: 1 }, 'weapon', 'arrow')
  // (5,1) 的上边 h:5,1 上有武器 → 拒绝放置
  const r = eng.placeBlock(5, 1, 'path')
  assert(!r.ok, '格子边上已有武器时不能放置路块')
  assert(eng.cells[eng.graph.cellIndex(5, 1)] === null, '被拒绝的路块未写入地图')
  assert(!eng.canPlaceBlockAt(5, 1, 'path'), '悬停预览同步：边上已有武器时不可放置')
  // 边上无设施的相邻格子仍可正常放置（(6,0) 贴边界可连通，且无武器在其边上）
  const r2 = eng.placeBlock(6, 0, 'path')
  assert(r2.ok, '边上无设施的格子仍可放置路块')
}

// 32. 格子边上正有敌人经过时不能放置路块（防止敌人路径失效）
{
  const eng = makeEngine()
  eng.gold = 500
  eng.placeBlock(5, 0, 'path')
  // 手动构造一个正位于 h:5,1 边上的敌人
  eng.enemies.push({
    id: 999, type: 'grunt', hp: 100, maxHp: 100, reward: 5, speedMult: 1,
    color: '#fff', radius: 4, immuneSlow: false, flying: false, split: 0,
    explode: false, stealth: false, heal: 0,
    x: 5.5, y: 1, path: null, pathIndex: 0,
    currentEdgeKey: 'h:5,1', target: { x: 10, y: 4 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  })
  const r = eng.placeBlock(5, 1, 'path')
  assert(!r.ok, '格子边上正有敌人经过时不能放置路块')
  assert(eng.cells[eng.graph.cellIndex(5, 1)] === null, '被拒绝的路块未写入地图')
  // 敌人不在该边时不受影响
  eng.enemies[0].currentEdgeKey = 'h:6,1'
  const r2 = eng.placeBlock(5, 1, 'path')
  assert(r2.ok, '敌人不在该格边上时可正常放置路块')
}

// 33. 放置不影响敌人剩余路径的路块时，敌人保持原路径不回头
{
  const eng = makeEngine()
  eng.gold = 500
  eng.startWave()
  let guard = 0
  while (eng.enemies.length === 0 && guard < 600) { eng.update(1 / 60); guard++ }
  const e = eng.enemies[0]
  // 推进让敌人沿左边界上行（默认路径第一阶段，远离目标 y）
  for (let i = 0; i < 200 && !e.dead && !e.reachedExit; i++) eng.update(1 / 60)
  const beforePath = JSON.stringify(e.path.slice(e.pathIndex).map((p) => [p.x, p.y]))
  const beforeY = e.y
  // 放置不影响该敌人剩余路径的路块（底部边界 (5,7)）
  const r = eng.placeBlock(5, 7, 'path')
  assert(r.ok, '底部边界路块可放置')
  const afterPath = JSON.stringify(e.path.slice(e.pathIndex).map((p) => [p.x, p.y]))
  assert(beforePath === afterPath, '敌人剩余路径保持不变（不回头）')
  // 继续推进，敌人应继续上行（y 减小）
  for (let i = 0; i < 30 && !e.dead && !e.reachedExit; i++) eng.update(1 / 60)
  assert(e.y < beforeY, '敌人继续上行而非回头')
}

// 34. 放置阻断敌人路径的路块时，敌人重新寻路绕行
{
  const eng = makeEngine()
  eng.gold = 500
  eng.startWave()
  let guard = 0
  while (eng.enemies.length === 0 && guard < 600) { eng.update(1 / 60); guard++ }
  const e = eng.enemies[0]
  // 推进到顶部边界向右走
  for (let i = 0; i < 400 && !e.dead && !e.reachedExit; i++) eng.update(1 / 60)
  const beforePath = JSON.stringify(e.path.slice(e.pathIndex).map((p) => [p.x, p.y]))
  const r = eng.placeBlock(7, 0, 'path')
  assert(r.ok, '阻断路径的顶部路块可放置')
  const afterPath = JSON.stringify(e.path.slice(e.pathIndex).map((p) => [p.x, p.y]))
  assert(beforePath !== afterPath, '路径被阻断时敌人重新寻路')
  // 新路径不得直穿被阻断的 h:7,0（从 (7,0) 直走到 (8,0)）
  const pts = e.path.slice(e.pathIndex).map((p) => [p.x, p.y])
  let straight = false
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i][0] === 7 && pts[i][1] === 0 && pts[i + 1][0] === 8 && pts[i + 1][1] === 0) straight = true
  }
  assert(!straight, '新路径绕开被阻断的 h:7,0')
}

// 35. 敌人选择最近出口：上生成线选上终点、下生成线选下终点
{
  const eng = makeEngine()
  const targets = eng.laneTargets()
  assert(targets[0].y < 4.5, `上生成线选择上方终点（最近出口，实际 y=${targets[0].y}）`)
  assert(targets[1].y > 4.5, `下生成线选择下方终点（最近出口，实际 y=${targets[1].y}）`)
}

// 36. 敌人可选择任一出口：堵死上方出口后，上生成线改选下方出口
{
  const eng = makeEngine()
  eng.gold = 500
  assert(eng.placeBlock(9, 3, 'path').ok, '右侧上部路块可放置')
  assert(eng.placeBlock(9, 4, 'path').ok, '右侧中部路块可放置')
  // 贪心路径可能结束在别的终点线，需校验最后一条边不是上方出口
  const path = eng.graph.greedyPath(eng.cells, eng.spawnLines[0], eng.exitTarget(eng.exitLines[0]))
  const topUnreachable = !path || eng.graph.edgeKey(path[path.length - 1]) !== 'h:10,4'
  assert(topUnreachable, '上方出口从上生成线不可达')
  const targets = eng.laneTargets()
  assert(targets[0].y > 4.5, `堵死上方出口后上生成线改选下方出口（实际 y=${targets[0].y}）`)
}

// 37. 敌人正在路块上行走时不能拆除
{
  const eng = makeEngine()
  eng.gold = 500
  assert(eng.placeBlock(5, 0, 'path').ok, '路块可放置')
  eng.enemies.push({
    id: 901, type: 'grunt', hp: 100, maxHp: 100, reward: 5, speedMult: 1,
    color: '#fff', radius: 4, immuneSlow: false, flying: false, split: 0,
    explode: false, stealth: false, heal: 0,
    x: 5.5, y: 1, path: null, pathIndex: 0,
    currentEdgeKey: 'h:5,1', target: { x: 10, y: 4 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  })
  const r = eng.removeBlock(5, 0)
  assert(!r.ok, '敌人正在路块上行走时不能拆除')
  assert(eng.cells[eng.graph.cellIndex(5, 0)] === 'path', '被禁止的拆除未生效')
  eng.enemies[0].currentEdgeKey = 'h:6,1'
  const r2 = eng.removeBlock(5, 0)
  assert(r2.ok, '敌人离开后可正常拆除')
}

// 38. 桥路块：四条边均可走，直穿路径经过格心
{
  const eng = makeEngine()
  eng.gold = 500
  const r = eng.placeBlock(5, 0, 'bridge')
  assert(r.ok, '桥路块可放置')
  const g = eng.graph
  assert(g.edgeWalkable(eng.cells, { dir: 'h', x: 5, y: 0 }), '桥顶边可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'h', x: 5, y: 1 }), '桥底边可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'v', x: 5, y: 0 }), '桥左边可走')
  assert(g.edgeWalkable(eng.cells, { dir: 'v', x: 6, y: 0 }), '桥右边可走')
  const opp = g.oppositeBridgeEdge(eng.cells, { dir: 'v', x: 5, y: 0 })
  assert(opp && g.edgeKey(opp) === 'v:6,0', `桥左边对边为 v:6,0（实际 ${opp && g.edgeKey(opp)}）`)
  const path = g.greedyPath(eng.cells, { dir: 'v', x: 5, y: 0 }, { x: 10, y: 4.5 })
  assert(path, '桥直穿寻路成功')
  const points = g.edgePathToPoints(path)
  assert(points.some((p) => p.x === 5.5 && p.y === 0.5), '桥直穿路径经过格心 (5.5,0.5)')
  // edgeBetweenPoints 正确处理格心
  const e1 = g.edgeBetweenPoints({ x: 5.5, y: 0.5 }, { x: 5, y: 0.5 })
  assert(g.edgeKey(e1) === 'v:5,0', `格心→左边中点 返回 v:5,0（实际 ${g.edgeKey(e1)}）`)
  const e2 = g.edgeBetweenPoints({ x: 5.5, y: 0.5 }, { x: 6, y: 0.5 })
  assert(g.edgeKey(e2) === 'v:6,0', `格心→右边中点 返回 v:6,0（实际 ${g.edgeKey(e2)}）`)
}

// 39. 敌人沿桥边走或穿过桥时不能拆除桥
{
  const eng = makeEngine()
  eng.gold = 500
  assert(eng.placeBlock(5, 0, 'bridge').ok, '桥路块可放置')
  const mk = (key) => ({
    id: 902, type: 'grunt', hp: 100, maxHp: 100, reward: 5, speedMult: 1,
    color: '#fff', radius: 4, immuneSlow: false, flying: false, split: 0,
    explode: false, stealth: false, heal: 0,
    x: 5.5, y: 0.5, path: null, pathIndex: 0,
    currentEdgeKey: key, target: { x: 10, y: 4 },
    slowTimer: 0, slowFactor: 1, stunTimer: 0, poisonTimer: 0, poisonDps: 0,
    teleportCooldown: 0, dead: false, reachedExit: false
  })
  eng.enemies.push(mk('v:5,0'))
  assert(!eng.removeBlock(5, 0).ok, '敌人沿桥边走时不能拆除桥')
  eng.enemies[0].currentEdgeKey = 'v:6,0'
  assert(!eng.removeBlock(5, 0).ok, '敌人穿过桥时不能拆除桥')
  // 敌人离开桥（边与位置都不在桥上）后可拆除
  eng.enemies[0].currentEdgeKey = 'h:9,1'
  eng.enemies[0].x = 9.5
  eng.enemies[0].y = 1
  assert(eng.removeBlock(5, 0).ok, '敌人离开桥后可拆除桥')
}

console.log(failures === 0 ? '\n全部测试通过' : `\n${failures} 个测试失败`)
process.exit(failures === 0 ? 0 : 1)
