// ===== 游戏引擎（纯逻辑，不依赖渲染）=====
import { GridGraph } from './graph.js'
import {
  CELL, TOTAL_WAVES,
  BLOCK_TYPES, WEAPON_TYPES, ARMOR_TYPES, TRAP_TYPES, PORTAL_TYPES,
  ENEMY_TYPES, UPGRADE_COSTS, weaponStats,
  generateWave, waveBonus
} from './config.js'

let nextId = 1

export class GameEngine {
  constructor(cfg) {
    this.cfg = cfg
    this.w = cfg.width
    this.h = cfg.height
    this.spawnSide = this.detectSide(cfg.spawn)
    this.exitSide = this.detectSide(cfg.exit)
    this.spawnLines = this.computeLines(cfg.spawn, this.spawnSide)
    this.exitLines = this.computeLines(cfg.exit, this.exitSide)
    this.graph = new GridGraph(this.w, this.h, this.spawnLines, this.exitLines)
    this.mapConfig = typeof cfg.config === 'string' ? this.parseConfig(cfg.config) : (cfg.config || {})
    this.fixedCells = new Set() // 悬浮岩块：不可移动、边上不可建造
    this.cells = new Array(this.w * this.h).fill(null)
    this.initTerrain()
    this.structures = new Map() // edgeKey -> { kind: 'weapon'|'armor'|'trap'|'portal', type, level?, pair? }
    this.enemies = []
    this.projectiles = []
    this.effects = []
    this.gold = cfg.startGold ?? 100
    this.lives = cfg.lives ?? 20
    this.wave = 0
    this.score = 0
    this.kills = 0
    this.state = 'build' // build | wave | over | win
    this.paused = false
    this.speed = 1
    this.waveTime = 0
    this.spawnQueue = []
    this.time = 0
    this.message = ''
    this.spawnLineIndex = 0
  }

  // 生成/终点位于哪一侧边界（配置节点 x/y 落在边界上）
  detectSide(node) {
    if (node.x === 0) return 'left'
    if (node.x === this.w) return 'right'
    if (node.y === 0) return 'top'
    return 'bottom'
  }

  parseConfig(s) {
    try {
      return JSON.parse(s)
    } catch {
      return {}
    }
  }

  // 放置悬浮岩块：占用格子、不可移动、边上不可建造
  initTerrain() {
    const terrain = this.mapConfig.terrain || []
    for (const t of terrain) {
      if (t.x < 0 || t.x >= this.w || t.y < 0 || t.y >= this.h) continue
      const idx = this.graph.cellIndex(t.x, t.y)
      this.cells[idx] = 'terrain'
      this.fixedCells.add(idx)
    }
  }

  // 边是否与悬浮岩块相邻（岩壁边上不可建造设施）
  isTerrainEdge(edge) {
    const cells = edge.dir === 'h' ? this.graph.hCells(edge.x, edge.y) : this.graph.vCells(edge.x, edge.y)
    for (const c of cells) {
      if (this.fixedCells.has(this.graph.cellIndex(c.cx, c.cy))) return true
    }
    return false
  }

  // 该地图是否允许使用此武器（weaponBan 禁用的武器不可建造）
  isWeaponAllowed(type) {
    const ban = this.mapConfig.weaponBan || []
    return !ban.includes(type)
  }

  // 生成/终点线：地图外格子的两条平行边，与相邻边界垂直
  // 左/右边界 → 两条水平线（上下）；上/下边界 → 两条垂直线（左右）
  computeLines(node, side) {
    if (side === 'left' || side === 'right') {
      const x = side === 'left' ? -1 : this.w
      return [
        { dir: 'h', x, y: node.y },
        { dir: 'h', x, y: node.y + 1 }
      ]
    }
    const y = side === 'top' ? -1 : this.h
    return [
      { dir: 'v', x: node.x, y },
      { dir: 'v', x: node.x + 1, y }
    ]
  }

  // 每条生成线选择最近的终点线作为贪心目标（敌人可进入任一出口）
  laneTargets() {
    const targets = []
    for (const spawnLine of this.spawnLines) {
      targets.push(this.nearestExitTargetFrom(spawnLine))
    }
    return targets
  }

  // 终点线对应的目标点（带车道偏移，引导敌人从正确方向接近）
  exitTarget(exitLine) {
    const mid = this.graph.edgeMidpoint(exitLine)
    const isFirst = this.graph.edgeKey(exitLine) === this.graph.edgeKey(this.exitLines[0])
    if (this.spawnSide === 'left' || this.spawnSide === 'right') {
      return { x: mid.x, y: mid.y + (isFirst ? -0.5 : 0.5) }
    }
    return { x: mid.x + (isFirst ? -0.5 : 0.5), y: mid.y }
  }

  // 从某条边出发，选择最近的、可达的终点线作为贪心目标
  // 注意：贪心路径可能结束在别的终点线，需校验路径最后一条边就是该终点线
  nearestExitTargetFrom(edge) {
    let best = null
    let bestD = Infinity
    for (const exitLine of this.exitLines) {
      const target = this.exitTarget(exitLine)
      const path = this.graph.greedyPath(this.cells, edge, target)
      if (!path || this.graph.edgeKey(path[path.length - 1]) !== this.graph.edgeKey(exitLine)) continue
      const em = this.graph.edgeMidpoint(exitLine)
      const sm = this.graph.edgeMidpoint(edge)
      const d = Math.hypot(em.x - sm.x, em.y - sm.y)
      if (d < bestD) {
        bestD = d
        best = target
      }
    }
    return best || this.exitTarget(this.exitLines[0])
  }

  // 飞行怪：选择最近的终点线中点
  nearestExitMidpoint(p) {
    let best = null
    let bestD = Infinity
    for (const exitLine of this.exitLines) {
      const mid = this.graph.edgeMidpoint(exitLine)
      const d = Math.hypot(mid.x - p.x, mid.y - p.y)
      if (d < bestD) {
        bestD = d
        best = mid
      }
    }
    return best
  }

  // ---------- 建造 / 拆除 ----------
  canAfford(cost) {
    return this.gold >= cost
  }

  placeBlock(cx, cy, type) {
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return { ok: false, msg: '超出地图范围' }
    const idx = this.graph.cellIndex(cx, cy)
    if (this.fixedCells.has(idx)) return { ok: false, msg: '悬浮岩块不可移动' }
    if (this.cells[idx]) return { ok: false, msg: '该格子已有方块' }
    const bt = BLOCK_TYPES[type]
    if (!bt) return { ok: false, msg: '未知方块' }
    if (!this.canAfford(bt.cost)) return { ok: false, msg: '金币不足' }
    if (!this.canConnectBlock(cx, cy)) return { ok: false, msg: '路块需与墙壁或其他路块相邻' }
    const edgeBlocked = this.blockEdgeBlocked(cx, cy)
    if (edgeBlocked) return { ok: false, msg: edgeBlocked }
    this.cells[idx] = type
    if (!this.hasValidPath()) {
      this.cells[idx] = null
      return { ok: false, msg: '放置后敌人将无法到达终点' }
    }
    this.gold -= bt.cost
    this.repathAll()
    return { ok: true }
  }

  // 放置路块前检查：该格子的四条边上存在设施或敌人时不可放置
  // （路块会改变边上可走性，导致武器/防具悬空或敌人路径失效）
  blockEdgeBlocked(cx, cy) {
    const edges = [
      { dir: 'v', x: cx, y: cy },
      { dir: 'v', x: cx + 1, y: cy },
      { dir: 'h', x: cx, y: cy },
      { dir: 'h', x: cx, y: cy + 1 }
    ]
    for (const e of edges) {
      if (this.structures.has(this.graph.edgeKey(e))) return '该格子的边上已有武器/防具，无法放置路块'
    }
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit || e.flying) continue
      if (e.currentEdgeKey && edges.some((ed) => this.graph.edgeKey(ed) === e.currentEdgeKey)) {
        return '该格子的边上正有敌人经过，无法放置路块'
      }
    }
    return null
  }

  // 路块需至少一条边与墙壁（外圈）或其他路块重叠
  canConnectBlock(cx, cy) {
    const edges = [
      { dir: 'v', x: cx, y: cy },
      { dir: 'v', x: cx + 1, y: cy },
      { dir: 'h', x: cx, y: cy },
      { dir: 'h', x: cx, y: cy + 1 }
    ]
    for (const e of edges) {
      if (this.graph.isBoundaryEdge(e)) return true
      const adj = e.dir === 'h' ? this.graph.hCells(e.x, e.y) : this.graph.vCells(e.x, e.y)
      for (const c of adj) {
        if (c.cx === cx && c.cy === cy) continue
        const t = this.cells[this.graph.cellIndex(c.cx, c.cy)]
        if (t && t !== 'terrain') return true
      }
    }
    return false
  }

  // 悬停预览：该格能否放置（含连通性、边上设施/敌人与路径校验）
  canPlaceBlockAt(cx, cy, type) {
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return false
    const idx = this.graph.cellIndex(cx, cy)
    if (this.cells[idx]) return false
    if (this.blockEdgeBlocked(cx, cy)) return false
    if (!this.canConnectBlock(cx, cy)) return false
    this.cells[idx] = type
    const ok = this.hasValidPath()
    this.cells[idx] = null
    return ok
  }

  removeBlock(cx, cy) {
    const idx = this.graph.cellIndex(cx, cy)
    const t = this.cells[idx]
    if (!t) return { ok: false, msg: '该格子没有方块' }
    if (this.fixedCells.has(idx)) return { ok: false, msg: '悬浮岩块不可拆除' }
    if (this.enemyOnBlock(cx, cy)) return { ok: false, msg: '敌人正在该路块上行走，无法拆除' }
    const msg = this.removalCheck(cx, cy)
    if (msg) return { ok: false, msg }
    this.cells[idx] = null
    this.gold += BLOCK_TYPES[t].cost
    this.repathAll()
    return { ok: true }
  }

  // 是否有敌人正在该格子的边上行走/穿过（含桥直穿，穿过桥时也在桥上）
  enemyOnBlock(cx, cy) {
    const edges = [
      { dir: 'v', x: cx, y: cy },
      { dir: 'v', x: cx + 1, y: cy },
      { dir: 'h', x: cx, y: cy },
      { dir: 'h', x: cx, y: cy + 1 }
    ]
    const isBridge = this.cells[this.graph.cellIndex(cx, cy)] === 'bridge'
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit || e.flying) continue
      if (e.currentEdgeKey && edges.some((ed) => this.graph.edgeKey(ed) === e.currentEdgeKey)) {
        return true
      }
      // 桥直穿：敌人经过桥格内部时其 currentEdgeKey 可能已切到非桥边，按位置兜底
      if (isBridge && e.x >= cx - 0.15 && e.x <= cx + 1.15 && e.y >= cy - 0.15 && e.y <= cy + 1.15) {
        return true
      }
    }
    return false
  }

  // 模拟拆除 (cx,cy)：若导致其他路块与墙壁断开或武器/防具悬空，返回错误信息
  removalCheck(cx, cy) {
    const idx = this.graph.cellIndex(cx, cy)
    const t = this.cells[idx]
    this.cells[idx] = null
    let msg = null
    if (!this.blocksConnectedToWall()) {
      msg = '拆除后其他路块将悬空'
    } else {
      for (const key of this.structures.keys()) {
        const edge = this.graph.parseEdgeKey(key)
        if (!this.graph.edgeWalkable(this.cells, edge)) {
          msg = '拆除后武器/防具将悬空'
          break
        }
      }
    }
    this.cells[idx] = t
    return msg
  }

  // 所有玩家路块是否都通过共享边连成一片，且至少与墙壁（外圈）相接（悬浮岩块不参与）
  blocksConnectedToWall() {
    const queue = []
    const visited = new Set()
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const idx = this.graph.cellIndex(cx, cy)
        if (!this.cells[idx] || this.fixedCells.has(idx)) continue
        if (cx === 0 || cx === this.w - 1 || cy === 0 || cy === this.h - 1) {
          visited.add(idx)
          queue.push([cx, cy])
        }
      }
    }
    while (queue.length) {
      const [cx, cy] = queue.shift()
      const idx = this.graph.cellIndex(cx, cy)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) continue
        const nidx = this.graph.cellIndex(nx, ny)
        if (this.cells[nidx] && !this.fixedCells.has(nidx) && !visited.has(nidx)) {
          visited.add(nidx)
          queue.push([nx, ny])
        }
      }
    }
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const idx = this.graph.cellIndex(cx, cy)
        if (this.cells[idx] && !this.fixedCells.has(idx) && !visited.has(idx)) return false
      }
    }
    return true
  }

  placeStructure(edge, kind, type) {
    const key = this.graph.edgeKey(edge)
    if (this.structures.has(key)) return { ok: false, msg: '该边上已有设施' }
    if (this.isSpawnOrExitEdge(edge)) return { ok: false, msg: '生成/终点边不可放置设施' }
    if (this.isTerrainEdge(edge)) return { ok: false, msg: '岩壁边上不可建造设施' }
    if (kind === 'weapon' && !this.isWeaponAllowed(type)) return { ok: false, msg: '该地图禁用此武器' }
    if (!this.graph.edgeWalkable(this.cells, edge)) return { ok: false, msg: '该边不可通行' }
    const def = this.structureDef(kind, type)
    if (!def) return { ok: false, msg: '未知设施' }
    if (!this.canAfford(def.cost)) return { ok: false, msg: '金币不足' }
    const s = { kind, type }
    if (kind === 'weapon') s.level = 1
    if (kind === 'portal') {
      // 与已有的未配对传送门自动配对
      for (const [k, other] of this.structures) {
        if (other.kind === 'portal' && !other.pair) {
          s.pair = k
          other.pair = key
          break
        }
      }
    }
    this.structures.set(key, s)
    this.gold -= def.cost
    return { ok: true, paired: !!s.pair }
  }

  structureDef(kind, type) {
    if (kind === 'weapon') return WEAPON_TYPES[type]
    if (kind === 'armor') return ARMOR_TYPES[type]
    if (kind === 'trap') return TRAP_TYPES[type]
    if (kind === 'portal') return PORTAL_TYPES[type]
    return null
  }

  removeStructure(edge) {
    const key = this.graph.edgeKey(edge)
    const s = this.structures.get(key)
    if (!s) return { ok: false, msg: '该边没有设施' }
    const def = this.structureDef(s.kind, s.type)
    if (s.kind === 'portal' && s.pair) {
      const other = this.structures.get(s.pair)
      if (other) other.pair = null
    }
    this.structures.delete(key)
    this.gold += def.cost
    return { ok: true }
  }

  isSpawnOrExitEdge(edge) {
    const key = this.graph.edgeKey(edge)
    return this.spawnLines.some((e) => this.graph.edgeKey(e) === key) ||
      this.exitLines.some((e) => this.graph.edgeKey(e) === key)
  }

  getBlockAt(cx, cy) {
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return null
    return this.cells[this.graph.cellIndex(cx, cy)]
  }

  getStructureAt(edge) {
    return this.structures.get(this.graph.edgeKey(edge)) || null
  }

  // ---------- 寻路 ----------
  // 每条生成线都必须有贪心通路到达至少一个终点（敌人可选择任一出口）
  // 贪心路径可能结束在别的终点线，需校验路径最后一条边就是该终点线
  hasValidPath() {
    for (const spawnLine of this.spawnLines) {
      let reachable = false
      for (const exitLine of this.exitLines) {
        const path = this.graph.greedyPath(this.cells, spawnLine, this.exitTarget(exitLine))
        if (path && this.graph.edgeKey(path[path.length - 1]) === this.graph.edgeKey(exitLine)) {
          reachable = true
          break
        }
      }
      if (!reachable) return false
    }
    return true
  }

  repathAll() {
    for (const e of this.enemies) {
      // 飞行怪直线飞行，不参与路块寻路
      if (e.flying) continue
      // 剩余路径仍全部可走时保持原路径，避免敌人无故回头
      // （贪心从当前边重寻路会选"离目标更近的端点"起步，敌人处于远离目标阶段时会被导向回头）
      if (e.path && e.pathIndex < e.path.length && this.pathStillWalkable(e)) continue
      let edge = null
      if (e.currentEdgeKey) edge = this.graph.parseEdgeKey(e.currentEdgeKey)
      let path = null
      if (edge && this.graph.edgeWalkable(this.cells, edge)) {
        // 重新选择最近的、可达的终点作为目标
        const target = this.nearestExitTargetFrom(edge)
        const fwd = this.enemyForwardNode(e, edge)
        path = this.graph.greedyPath(this.cells, edge, target, fwd)
        // 前进方向被完全阻断时，回退到离目标更近的端点起步
        if (!path && fwd) {
          path = this.graph.greedyPath(this.cells, edge, target)
        }
        if (path) e.target = target
      }
      if (path) {
        const points = this.graph.edgePathToPoints(path)
        points[0] = { x: e.x, y: e.y }
        e.path = points
        e.pathIndex = 1
      } else {
        e.path = null
        e.pathIndex = 0
      }
    }
  }

  // 敌人当前正走向的当前边端点（前进方向）
  enemyForwardNode(e, edge) {
    const target = e.path && e.path[e.pathIndex]
    if (!target) return null
    const ends = this.graph.edgeEnds(edge)
    for (const p of ends) {
      if (p.x === target.x && p.y === target.y) return p
    }
    return null
  }

  // 敌人剩余路径（当前目标点起）是否仍全部可走
  pathStillWalkable(e) {
    const pts = e.path
    if (!pts || e.pathIndex >= pts.length) return true
    for (let i = e.pathIndex; i < pts.length - 1; i++) {
      const edge = this.graph.edgeBetweenPoints(pts[i], pts[i + 1])
      if (!this.graph.edgeWalkable(this.cells, edge)) return false
    }
    return true
  }

  // ---------- 波次 ----------
  startWave() {
    if (this.state !== 'build') return { ok: false, msg: '当前无法开始波次' }
    if (!this.hasValidPath()) return { ok: false, msg: '没有可行路径，请先铺路' }
    this.wave++
    this.spawnQueue = generateWave(this.wave)
    this.waveTime = 0
    this.state = 'wave'
    return { ok: true }
  }

  // ---------- 主循环 ----------
  update(dt) {
    if (this.paused || this.state === 'over' || this.state === 'win') return
    dt = Math.min(dt, 0.05) * this.speed
    this.time += dt

    if (this.state === 'wave') {
      this.waveTime += dt
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveTime) {
        const ev = this.spawnQueue.shift()
        this.spawnEnemy(ev.type, ev.hpScale)
      }
    }

    for (const e of this.enemies) {
      if (!e.dead && !e.reachedExit) this.moveEnemy(e, dt)
    }
    this.updateHealers(dt)
    this.updateBombers(dt)
    this.enemies = this.enemies.filter((e) => !e.dead && !e.reachedExit)

    this.updateWeapons(dt)
    this.updateProjectiles(dt)
    this.effects = this.effects.filter((fx) => (fx.t += dt) < fx.dur)

    if (this.state === 'wave' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.onWaveCleared()
    }
  }

  // 在两条生成线之间轮换出生
  spawnEnemy(type, hpScale) {
    const def = ENEMY_TYPES[type]
    const mod = this.mapConfig.enemyMod || {}
    const hpMult = mod.hp || 1
    const rewardMult = mod.reward || 1
    const speedMult = mod.speed || 1
    const { edge, path, target, spawnIdx } = this.pickSpawn()
    let points = path ? this.graph.edgePathToPoints(path) : null
    const start = points ? points[0] : this.graph.edgeMidpoint(edge)
    if (def.flying) {
      // 飞行怪：无视路块，从生成点直线飞向最近的终点线中点
      const exitMid = this.nearestExitMidpoint(start)
      points = [start, exitMid]
    }
    this.enemies.push({
      id: nextId++,
      type,
      hp: def.hp * (hpScale || 1) * hpMult,
      maxHp: def.hp * (hpScale || 1) * hpMult,
      reward: Math.round(def.reward * rewardMult),
      speedMult,
      color: def.color,
      radius: def.radius,
      immuneSlow: !!def.immuneSlow,
      flying: !!def.flying,
      split: def.split || 0,
      explode: !!def.explode,
      stealth: !!def.stealth,
      heal: def.heal || 0,
      x: start.x,
      y: start.y,
      path: points,
      pathIndex: 1,
      currentEdgeKey: def.flying ? null : this.graph.edgeKey(edge),
      target,
      slowTimer: 0,
      slowFactor: 1,
      stunTimer: 0,
      poisonTimer: 0,
      poisonDps: 0,
      teleportCooldown: 0,
      dead: false,
      reachedExit: false
    })
  }

  pickSpawn() {
    const targets = this.laneTargets()
    for (let i = 0; i < this.spawnLines.length; i++) {
      const idx = (this.spawnLineIndex + i) % this.spawnLines.length
      const edge = this.spawnLines[idx]
      const path = this.graph.greedyPath(this.cells, edge, targets[idx])
      if (path) {
        this.spawnLineIndex = (this.spawnLineIndex + 1) % this.spawnLines.length
        return { edge, path, target: targets[idx], spawnIdx: idx }
      }
    }
    return { edge: this.spawnLines[0], path: null, target: targets[0], spawnIdx: 0 }
  }

  moveEnemy(e, dt) {
    if (e.stunTimer > 0) {
      e.stunTimer -= dt
      return
    }
    if (e.teleportCooldown > 0) e.teleportCooldown -= dt
    let factor = 1
    if (e.slowTimer > 0) {
      e.slowTimer -= dt
      factor = e.slowFactor
    }
    if (e.poisonTimer > 0) {
      e.poisonTimer -= dt
      this.damageEnemy(e, e.poisonDps * dt)
      if (e.dead) return
    }
    if (!e.path || e.pathIndex >= e.path.length) {
      // 走到路径终点即到达终点线中点
      if (e.path && e.path.length > 0) this.enemyReachedExit(e)
      return
    }
    const from = e.path[e.pathIndex - 1]
    const target = e.path[e.pathIndex]
    const edge = this.graph.edgeBetweenPoints(from, target)
    const key = this.graph.edgeKey(edge)
    if (!e.flying && e.currentEdgeKey !== key) {
      e.currentEdgeKey = key
      this.onEnterEdge(e, edge)
      if (e.dead || e.reachedExit) return
    }
    const props = e.flying ? { speed: 1, gold: 0 } : this.graph.edgeProps(this.cells, edge)
    const spd = ENEMY_TYPES[e.type].speed * (e.speedMult || 1) * props.speed * factor
    const dx = target.x - e.x
    const dy = target.y - e.y
    const dist = Math.hypot(dx, dy)
    const step = spd * dt
    if (step >= dist) {
      e.x = target.x
      e.y = target.y
      e.pathIndex++
    } else {
      e.x += (dx / dist) * step
      e.y += (dy / dist) * step
    }
  }

  onEnterEdge(e, edge) {
    const props = this.graph.edgeProps(this.cells, edge)
    if (props.gold > 0) {
      this.gold += props.gold
      this.score += props.gold
      this.addEffect({ type: 'text', x: e.x, y: e.y - 0.4, text: `+${props.gold}`, color: '#ffd54f' })
    }
    const key = this.graph.edgeKey(edge)
    const s = this.structures.get(key)
    if (!s) return
    if (s.kind === 'armor') {
      if (s.type === 'slow' && !e.immuneSlow) {
        e.slowTimer = ARMOR_TYPES.slow.slowDur
        e.slowFactor = ARMOR_TYPES.slow.slow
      } else if (s.type === 'barricade') {
        e.stunTimer = ARMOR_TYPES.barricade.stun
      }
    } else if (s.kind === 'trap') {
      this.triggerTrap(e, s)
    } else if (s.kind === 'portal') {
      this.teleportEnemy(e, s)
    }
  }

  // 陷阱：充能后对经过的敌人造成伤害/麻痹
  triggerTrap(e, s) {
    const def = TRAP_TYPES[s.type]
    if (def.oneShot) {
      // 地雷：一次性，触发后摧毁自身
      const key = [...this.structures.entries()].find(([, v]) => v === s)?.[0]
      this.structures.delete(key)
      this.damageEnemy(e, def.damage)
      this.addEffect({ type: 'boom', x: e.x, y: e.y, dur: 0.4, color: def.color, radius: 0.6 })
      return
    }
    s.cooldown = (s.cooldown || 0)
    if (s.cooldown > 0) return
    s.cooldown = def.cooldown
    this.damageEnemy(e, def.damage)
    if (def.stun && !e.dead) e.stunTimer = Math.max(e.stunTimer || 0, def.stun)
    this.addEffect({ type: 'boom', x: e.x, y: e.y, dur: 0.3, color: def.color, radius: 0.4 })
  }

  // 传送门：把敌人送到配对门的位置，重新寻路
  teleportEnemy(e, s) {
    if (!s.pair || e.teleportCooldown > 0) return
    const other = this.structures.get(s.pair)
    if (!other) return
    const mid = this.edgeMidpoint(s.pair)
    const path = this.graph.greedyPath(this.cells, this.graph.parseEdgeKey(s.pair), e.target)
    if (!path) return
    const points = this.graph.edgePathToPoints(path)
    points[0] = { x: mid.x, y: mid.y }
    e.x = mid.x
    e.y = mid.y
    e.path = points
    e.pathIndex = 1
    e.currentEdgeKey = s.pair
    e.teleportCooldown = 0.6
    this.addEffect({ type: 'boom', x: mid.x, y: mid.y, dur: 0.4, color: PORTAL_TYPES.portal.color, radius: 0.5 })
    this.addEffect({ type: 'text', x: mid.x, y: mid.y - 0.4, text: '传送', color: PORTAL_TYPES.portal.color })
  }

  // 治疗怪：为周围敌人回血
  updateHealers(dt) {
    for (const h of this.enemies) {
      if (h.dead || h.reachedExit || !h.heal) continue
      for (const e of this.enemies) {
        if (e === h || e.dead || e.reachedExit) continue
        if (Math.hypot(e.x - h.x, e.y - h.y) <= 1.2) {
          e.hp = Math.min(e.maxHp, e.hp + h.heal * dt)
        }
      }
    }
  }

  // 自爆怪：靠近设施时自爆摧毁它
  updateBombers(dt) {
    for (const b of this.enemies) {
      if (b.dead || b.reachedExit || !b.explode) continue
      let bestKey = null
      let bestD = Infinity
      for (const [key, s] of this.structures) {
        const pos = this.edgeMidpoint(key)
        const d = Math.hypot(b.x - pos.x, b.y - pos.y)
        if (d < bestD) {
          bestD = d
          bestKey = key
        }
      }
      if (bestKey && bestD <= 0.9) {
        const s = this.structures.get(bestKey)
        const def = this.structureDef(s.kind, s.type)
        this.structures.delete(bestKey)
        if (s.kind === 'portal' && s.pair) {
          const other = this.structures.get(s.pair)
          if (other) other.pair = null
        }
        this.addEffect({ type: 'boom', x: b.x, y: b.y, dur: 0.5, color: '#ff1744', radius: 0.8 })
        this.addEffect({ type: 'text', x: b.x, y: b.y - 0.4, text: '设施被毁!', color: '#ff1744' })
        b.dead = true
        this.kills++
      }
    }
  }

  damageEnemy(e, dmg) {
    if (e.dead) return
    e.hp -= dmg
    if (e.hp <= 0) {
      e.dead = true
      this.kills++
      this.gold += e.reward
      this.score += e.reward
      this.addEffect({ type: 'text', x: e.x, y: e.y - 0.4, text: `+${e.reward}`, color: '#ffd54f' })
      this.addEffect({ type: 'boom', x: e.x, y: e.y, dur: 0.3, color: e.color })
      if (e.split > 0) this.splitEnemy(e)
    }
  }

  // 分裂怪死亡后分裂成多个小怪，沿原路径继续前进
  splitEnemy(e) {
    const mini = ENEMY_TYPES.mini
    for (let i = 0; i < e.split; i++) {
      const offset = i === 0 ? -0.3 : 0.3
      this.enemies.push({
        id: nextId++,
        type: 'mini',
        hp: mini.hp,
        maxHp: mini.hp,
        reward: mini.reward,
        speedMult: e.speedMult || 1,
        color: mini.color,
        radius: mini.radius,
        immuneSlow: false,
        split: 0,
        explode: false,
        stealth: false,
        heal: 0,
        x: e.x + offset,
        y: e.y,
        path: e.path ? e.path.map((p) => ({ ...p })) : null,
        pathIndex: Math.max(1, e.pathIndex - 1),
        currentEdgeKey: e.currentEdgeKey,
        target: e.target,
        slowTimer: 0,
        slowFactor: 1,
        stunTimer: 0,
        poisonTimer: 0,
        poisonDps: 0,
        teleportCooldown: 0,
        dead: false,
        reachedExit: false
      })
    }
  }

  enemyReachedExit(e) {
    e.reachedExit = true
    this.lives--
    this.addEffect({ type: 'text', x: e.x, y: e.y - 0.3, text: '-1', color: '#ff5252' })
    if (this.lives <= 0) {
      this.lives = 0
      this.state = 'over'
    }
  }

  onWaveCleared() {
    const bonus = waveBonus(this.wave)
    this.gold += bonus
    this.score += bonus
    this.addEffect({
      type: 'text', x: this.w / 2, y: this.h / 2,
      text: `第 ${this.wave} 波通过 +${bonus} 金币`, color: '#ffd54f', dur: 2, big: true
    })
    if (this.wave >= TOTAL_WAVES) {
      this.state = 'win'
    } else {
      this.state = 'build'
    }
  }

  // ---------- 武器 ----------
  updateWeapons(dt) {
    for (const [key, s] of this.structures) {
      if (s.kind !== 'weapon') continue
      const st = weaponStats(s.type, s.level)
      const pos = this.edgeMidpoint(key)
      s.cooldown = (s.cooldown || 0) - dt
      let target = null
      let best = Infinity
      for (const e of this.enemies) {
        if (e.dead || e.reachedExit) continue
        // 防空：非防空武器不能攻击飞行怪
        if (e.flying && !st.antiAir) continue
        const d = Math.hypot(e.x - pos.x, e.y - pos.y)
        if (d <= st.range && d < best) {
          best = d
          target = e
        }
      }
      if (target && s.cooldown <= 0) {
        s.cooldown = 1 / st.fireRate
        this.projectiles.push({
          x: pos.x, y: pos.y, target,
          speed: 9,
          damage: st.damage,
          splash: st.splash,
          slow: st.slow,
          slowDur: st.slowDur,
          poison: st.poison,
          poisonDur: st.poisonDur,
          antiAir: st.antiAir,
          pierce: st.pierce || 0,
          chain: st.chain || false,
          freeze: st.freeze || 0,
          spread: st.spread || 0,
          color: WEAPON_TYPES[s.type].color
        })
      }
    }
  }

  // ---------- 塔升级 ----------
  upgradeStructure(edge) {
    const key = this.graph.edgeKey(edge)
    const s = this.structures.get(key)
    if (!s || s.kind !== 'weapon') return { ok: false, msg: '该边没有可升级的武器' }
    if (s.level >= 3) return { ok: false, msg: '已满级' }
    const cost = UPGRADE_COSTS[s.type][s.level]
    if (!this.canAfford(cost)) return { ok: false, msg: '金币不足' }
    this.gold -= cost
    s.level++
    this.addEffect({ type: 'text', x: this.edgeMidpoint(key).x, y: this.edgeMidpoint(key).y - 0.5, text: `升级 Lv.${s.level}`, color: '#ffe14d' })
    return { ok: true, level: s.level }
  }

  // ---------- 隐藏设施解锁 ----------
  // 设施定义带 unlock 条件（kills 累计击杀 / wave 到达波次），达成后解锁
  isUnlocked(kind, type) {
    const def = this.structureDef(kind, type)
    if (!def || !def.unlock) return true
    const u = def.unlock
    if (u.kills !== undefined && this.kills >= u.kills) return true
    if (u.wave !== undefined && this.wave >= u.wave) return true
    return false
  }

  // 隐形怪是否被任何武器侦测到（渲染用）
  isStealthRevealed(e) {
    for (const [key, s] of this.structures) {
      if (s.kind !== 'weapon') continue
      const st = weaponStats(s.type, s.level)
      const pos = this.edgeMidpoint(key)
      if (Math.hypot(e.x - pos.x, e.y - pos.y) <= st.range) return true
    }
    return false
  }

  updateProjectiles(dt) {
    for (const p of [...this.projectiles]) {
      // 目标死亡/离场后弹幕不立即清除，继续飞向目标最后位置（低等小怪成群死亡时弹幕不浪费）
      const tx = p.target.x
      const ty = p.target.y
      const dx = tx - p.x
      const dy = ty - p.y
      const dist = Math.hypot(dx, dy)
      const step = p.speed * dt
      if (step >= dist) {
        this.applyProjectileHit(p, tx, ty)
        this.projectiles = this.projectiles.filter((x) => x !== p)
      } else {
        p.x += (dx / dist) * step
        p.y += (dy / dist) * step
      }
    }
  }

  applyProjectileHit(p, x, y) {
    if (p.splash > 0) {
      // 主爆炸（防空武器可炸到飞行怪）
      const hit = []
      for (const e of this.enemies) {
        if (e.dead || e.reachedExit) continue
        if (e.flying && !p.antiAir) continue
        if (Math.hypot(e.x - x, e.y - y) <= p.splash) {
          this.damageEnemy(e, p.damage)
          this.applyStatus(e, p)
          hit.push(e)
        }
      }
      this.addEffect({ type: 'boom', x, y, dur: 0.35, color: '#ff8a65', radius: p.splash })
      // 炮塔 Lv.3 连环爆炸：被主爆炸击中的敌人引发二次小爆炸
      if (p.chain) {
        for (const e of hit) {
          if (e.dead) continue
          this.chainExplosion(e, p)
        }
      }
    } else {
      // 直接命中（目标可能已死亡，弹幕仍飞向最后位置）
      if (p.target && !p.target.dead) {
        this.damageEnemy(p.target, p.damage)
        this.applyStatus(p.target, p)
      }
      // 满级特殊能力在命中点触发
      if (p.pierce > 0) this.pierceHit(p, x, y)
      if (p.freeze > 0) this.freezeArea(p, x, y)
      if (p.spread > 0) this.spreadPoison(p, x, y)
    }
  }

  // 炮塔 Lv.3：连环爆炸
  chainExplosion(e, p) {
    const dmg = Math.round(p.damage * 0.6)
    for (const o of this.enemies) {
      if (o.dead || o.reachedExit || o === e) continue
      if (o.flying && !p.antiAir) continue
      if (Math.hypot(o.x - e.x, o.y - e.y) <= 0.7) {
        this.damageEnemy(o, dmg)
        this.applyStatus(o, p)
      }
    }
    this.addEffect({ type: 'boom', x: e.x, y: e.y, dur: 0.3, color: '#ff8a65', radius: 0.7 })
  }

  // 箭塔 Lv.3：穿透，弹道方向上的后续敌人也受伤害
  pierceHit(p, x, y) {
    const dx = x - p.x
    const dy = y - p.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    let hits = 0
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit || e === p.target) continue
      if (e.flying && !p.antiAir) continue
      const rx = e.x - p.x
      const ry = e.y - p.y
      const proj = rx * ux + ry * uy
      if (proj < 0) continue
      const perp = Math.abs(rx * uy - ry * ux)
      if (perp <= 0.6 && hits < p.pierce) {
        this.damageEnemy(e, p.damage)
        this.applyStatus(e, p)
        hits++
      }
    }
  }

  // 冰塔 Lv.3：命中点周围敌人被冻结 1 秒
  freezeArea(p, x, y) {
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit) continue
      if (e.flying && !p.antiAir) continue
      if (Math.hypot(e.x - x, e.y - y) <= p.freeze) {
        e.stunTimer = Math.max(e.stunTimer || 0, 1)
      }
    }
    this.addEffect({ type: 'boom', x, y, dur: 0.3, color: '#00e5ff', radius: p.freeze })
  }

  // 毒塔 Lv.3：中毒传染到命中点周围的敌人
  spreadPoison(p, x, y) {
    for (const e of this.enemies) {
      if (e.dead || e.reachedExit || e === p.target) continue
      if (e.flying && !p.antiAir) continue
      if (Math.hypot(e.x - x, e.y - y) <= p.spread) {
        this.applyStatus(e, p)
      }
    }
  }

  applyStatus(e, p) {
    if (p.slow && !e.immuneSlow) {
      e.slowTimer = p.slowDur
      e.slowFactor = p.slow
    }
    if (p.poison) {
      e.poisonTimer = p.poisonDur
      e.poisonDps = p.poison
    }
  }

  // ---------- 工具 ----------
  edgeMidpoint(key) {
    const [dir, rest] = key.split(':')
    const [x, y] = rest.split(',').map(Number)
    return dir === 'h' ? { x: x + 0.5, y } : { x, y: y + 0.5 }
  }

  edgeAt(px, py) {
    const cx = Math.floor(px / CELL)
    const cy = Math.floor(py / CELL)
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return null
    const fx = (px % CELL) / CELL
    const fy = (py % CELL) / CELL
    const candidates = [
      { edge: { dir: 'v', x: cx, y: cy }, d: fx },
      { edge: { dir: 'v', x: cx + 1, y: cy }, d: 1 - fx },
      { edge: { dir: 'h', x: cx, y: cy }, d: fy },
      { edge: { dir: 'h', x: cx, y: cy + 1 }, d: 1 - fy }
    ]
    candidates.sort((a, b) => a.d - b.d)
    if (candidates[0].d * CELL <= 14) return candidates[0].edge
    return null
  }

  cellAt(px, py) {
    const cx = Math.floor(px / CELL)
    const cy = Math.floor(py / CELL)
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return null
    return { cx, cy }
  }

  // 点击点附近（14px 内）最近的设施边，用于拆除/升级判定
  // 不依赖 edgeAt 的最近边判定，避免节点处平局歧义导致点中错误边
  structureNear(px, py) {
    let bestKey = null
    let bestD = Infinity
    for (const [key] of this.structures) {
      const pos = this.edgeMidpoint(key)
      const d = Math.hypot(pos.x * CELL - px, pos.y * CELL - py)
      if (d < bestD) {
        bestD = d
        bestKey = key
      }
    }
    return bestD <= 14 ? bestKey : null
  }

  addEffect(fx) {
    fx.t = 0
    fx.dur = fx.dur || 0.8
    this.effects.push(fx)
  }
}
