// ===== Canvas 渲染器（科幻霓虹风格，与 UI 的 #00e5ff / #ff2bd6 / #ffe14d 呼应）=====
import { CELL, BLOCK_TYPES, WEAPON_TYPES, ARMOR_TYPES, TRAP_TYPES, PORTAL_TYPES, ENEMY_TYPES } from './config.js'

const TAU = Math.PI * 2

const C = {
  bgTop: '#0c1220',
  bgMid: '#0a0e16',
  bgBot: '#0e0a1a',
  panel: '#0f1522',
  grid: 'rgba(0,229,255,0.07)',
  cyan: '#00e5ff',
  magenta: '#ff2bd6',
  gold: '#ffe14d',
  green: '#2ee6a8',
  red: '#ff4d6d',
  purple: '#b388ff',
  orange: '#ff9f43',
  white: '#eaf7ff'
}

export class Renderer {
  constructor(ctx, engine) {
    this.ctx = ctx
    this.engine = engine
    this.hoverCell = null
    this.hoverEdge = null
    this.buildMode = null // { kind: 'block'|'weapon'|'armor'|'sell', type }
  }

  render() {
    const { ctx, engine } = this
    const w = engine.w * CELL
    const h = engine.h * CELL
    ctx.clearRect(0, 0, w, h)
    this.drawBackground()
    this.drawCells()
    this.drawEdges()
    this.drawSpawnExit()
    this.drawStructures()
    this.drawEnemies()
    this.drawProjectiles()
    this.drawEffects()
    this.drawHover()
  }

  // hex 颜色转 rgba，用于光晕分层
  alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return `rgba(${r},${g},${b},${a})`
  }

  // ================= 地图背景 =================
  drawBackground() {
    const { ctx, engine } = this
    const w = engine.w * CELL
    const h = engine.h * CELL
    // 深空渐变
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, C.bgTop)
    g.addColorStop(0.5, C.bgMid)
    g.addColorStop(1, C.bgBot)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // 科技网格，清晰标注每一格
    ctx.strokeStyle = C.grid
    ctx.lineWidth = 1
    ctx.setLineDash([3, 5])
    for (let x = 0; x <= engine.w; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, h)
      ctx.stroke()
    }
    for (let y = 0; y <= engine.h; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL)
      ctx.lineTo(w, y * CELL)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // 四角 HUD 边框
    const L = 20
    ctx.strokeStyle = 'rgba(0,229,255,0.4)'
    ctx.lineWidth = 2
    const corners = [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * L, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + sy * L)
      ctx.stroke()
    }
  }

  // ================= 方格 =================
  drawCells() {
    const { ctx, engine } = this
    for (let cy = 0; cy < engine.h; cy++) {
      for (let cx = 0; cx < engine.w; cx++) {
        const t = engine.cells[engine.graph.cellIndex(cx, cy)]
        const px = cx * CELL
        const py = cy * CELL
        if (!t) {
          this.drawEmptyCell(px, py)
          continue
        }
        if (t === 'terrain') {
          this.drawTerrainCell(px, py)
          continue
        }
        this.drawBlockCell(t, BLOCK_TYPES[t], px, py)
      }
    }
  }

  // 悬浮岩块：不可移动、边上不可建造，紫色霓虹岩石 + 悬浮浮动
  drawTerrainCell(px, py) {
    const { ctx, engine } = this
    const t = engine.time
    const cx = px + CELL / 2
    const cy = py + CELL / 2
    const bob = Math.sin(t * 1.6 + (px + py) * 0.12) * 1.6
    const pts = [
      [0.14, 0.24], [0.5, 0.1], [0.86, 0.2],
      [0.94, 0.55], [0.82, 0.86], [0.45, 0.93],
      [0.14, 0.86], [0.06, 0.5]
    ]
    ctx.save()
    ctx.translate(0, bob)
    // 底部悬浮阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(cx, py + CELL - 3, CELL * 0.3, 4, 0, 0, TAU)
    ctx.fill()
    // 岩石主体
    const g = ctx.createLinearGradient(px, py, px + CELL, py + CELL)
    g.addColorStop(0, '#5b6b80')
    g.addColorStop(1, '#2b3542')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(px + pts[0][0] * CELL, py + pts[0][1] * CELL)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(px + pts[i][0] * CELL, py + pts[i][1] * CELL)
    ctx.closePath()
    ctx.fill()
    // 紫色霓虹描边（与路块区分）
    ctx.strokeStyle = 'rgba(179,136,255,0.65)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.moveTo(px + pts[0][0] * CELL, py + pts[0][1] * CELL)
    for (let i = 1; i < 4; i++) ctx.lineTo(px + pts[i][0] * CELL, py + pts[i][1] * CELL)
    ctx.closePath()
    ctx.fill()
    // 裂纹
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - 7, cy + 1)
    ctx.lineTo(cx - 1, cy + 6)
    ctx.lineTo(cx + 5, cy + 2)
    ctx.stroke()
    // 悬浮能量环
    ctx.strokeStyle = 'rgba(179,136,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.ellipse(cx, py + CELL - 3, CELL * 0.32, 4.5, 0, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  drawEmptyCell(px, py) {
    const { ctx } = this
    ctx.fillStyle = C.panel
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
    ctx.strokeStyle = 'rgba(0,229,255,0.06)'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3)
  }

  drawBlockCell(t, def, px, py) {
    const { ctx, engine } = this
    const pulse = 0.5 + 0.5 * Math.sin(engine.time * 2 + (px + py) * 0.05)
    // 面板渐变底色
    const g = ctx.createLinearGradient(px, py, px + CELL, py + CELL)
    g.addColorStop(0, def.color)
    g.addColorStop(1, def.dark)
    ctx.fillStyle = g
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ctx.fillRect(px + 1, py + 1, CELL - 2, 3)
    // 霓虹描边（呼吸）
    ctx.strokeStyle = def.color
    ctx.globalAlpha = 0.45 + 0.3 * pulse
    ctx.lineWidth = 1.5
    ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2)
    ctx.globalAlpha = 1
    // 四角装饰
    const L = 4
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    const corners = [
      [px + 1, py + 1, 1, 1],
      [px + CELL - 1, py + 1, -1, 1],
      [px + 1, py + CELL - 1, 1, -1],
      [px + CELL - 1, py + CELL - 1, -1, -1]
    ]
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath()
      ctx.moveTo(cx + sx * L, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + sy * L)
      ctx.stroke()
    }
    this.drawCellTexture(t, px, py)
  }

  drawCellTexture(t, px, py) {
    const { ctx, engine } = this
    const cx = px + CELL / 2
    const cy = py + CELL / 2
    const t2 = engine.time
    ctx.save()
    if (t === 'slow') {
      // 冰晶：旋转六角雪花
      ctx.translate(cx, cy)
      ctx.rotate(t2 * 0.4)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(0, 0, 2, 0, TAU)
      ctx.fill()
    } else if (t === 'gold') {
      // 金币：脉冲能量币
      const r = 5 + Math.sin(t2 * 3) * 0.8
      ctx.fillStyle = 'rgba(255,225,77,0.9)'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = 'rgba(120,80,0,0.9)'
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('$', cx, cy + 0.5)
    } else if (t === 'bridge') {
      // 桥：两条平行桥板 + 桥墩 + 中央直穿虚线
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px + 4, py + 9)
      ctx.lineTo(px + CELL - 4, py + 9)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(px + 4, py + CELL - 9)
      ctx.lineTo(px + CELL - 4, py + CELL - 9)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      for (const bx of [px + 8, px + CELL - 8]) {
        ctx.beginPath()
        ctx.moveTo(bx, py + 9)
        ctx.lineTo(bx, py + CELL - 9)
        ctx.stroke()
      }
      // 中央虚线：表示可直穿
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(px + 6, cy)
      ctx.lineTo(px + CELL - 6, cy)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      // 普通路块：电路节点
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px + 6, cy)
      ctx.lineTo(cx - 4, cy)
      ctx.moveTo(cx + 4, cy)
      ctx.lineTo(px + CELL - 6, cy)
      ctx.moveTo(cx, py + 6)
      ctx.lineTo(cx, cy - 4)
      ctx.moveTo(cx, cy + 4)
      ctx.lineTo(cx, py + CELL - 6)
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,229,255,0.5)'
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  // ================= 可走边（霓虹光晕 + 流动虚线）=================
  drawEdges() {
    const { ctx, engine } = this
    ctx.lineCap = 'round'
    // 外圈墙壁
    ctx.strokeStyle = '#2a3040'
    ctx.lineWidth = 6
    ctx.strokeRect(0, 0, engine.w * CELL, engine.h * CELL)
    // 外圈霓虹描边
    ctx.strokeStyle = 'rgba(0,229,255,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, engine.w * CELL - 2, engine.h * CELL - 2)

    // 水平可走边（路块边界）
    for (let y = 0; y <= engine.h; y++) {
      for (let x = 0; x < engine.w; x++) {
        const edge = { dir: 'h', x, y }
        if (!engine.graph.edgeWalkable(engine.cells, edge)) continue
        const props = engine.graph.edgeProps(engine.cells, edge)
        const color = this.edgeColor(props)
        this.strokeWalkableEdge(color, x * CELL, y * CELL, (x + 1) * CELL, y * CELL)
      }
    }
    // 垂直可走边（路块边界）
    for (let y = 0; y < engine.h; y++) {
      for (let x = 0; x <= engine.w; x++) {
        const edge = { dir: 'v', x, y }
        if (!engine.graph.edgeWalkable(engine.cells, edge)) continue
        const props = engine.graph.edgeProps(engine.cells, edge)
        const color = this.edgeColor(props)
        this.strokeWalkableEdge(color, x * CELL, y * CELL, x * CELL, (y + 1) * CELL)
      }
    }
  }

  strokeWalkableEdge(color, x0, y0, x1, y1) {
    const { ctx, engine } = this
    // 光晕
    ctx.strokeStyle = this.alpha(color, 0.35)
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    // 主线
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    // 流动虚线（沿行进方向）
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 9])
    ctx.lineDashOffset = -engine.time * 22
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.setLineDash([])
  }

  edgeColor(props) {
    if (props.gold > 0) return '#ffd54f'
    if (props.speed < 1) return '#3aa0ff'
    return '#8fd8ff'
  }

  // ================= 生成 / 终点 =================
  drawSpawnExit() {
    const { ctx, engine } = this
    const pulse = 0.6 + 0.4 * Math.sin(engine.time * 4)
    for (const edge of engine.spawnLines) {
      this.drawEdgeMarker(edge, '#2ee6a8', '出', this.spawnDir(edge), pulse)
    }
    for (const edge of engine.exitLines) {
      this.drawEdgeMarker(edge, '#ff4d6d', '口', this.exitDir(edge), pulse)
    }
  }

  // 生成线在地图外，箭头指向敌人进入地图的方向
  spawnDir(edge) {
    if (edge.dir === 'h') return edge.x < 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }
    return edge.y < 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }
  }

  // 终点线在地图外，箭头指向敌人离开地图的方向
  exitDir(edge) {
    if (edge.dir === 'h') return edge.x < 0 ? { x: -1, y: 0 } : { x: 1, y: 0 }
    return edge.y < 0 ? { x: 0, y: -1 } : { x: 0, y: 1 }
  }

  drawEdgeMarker(edge, color, label, dir, pulse) {
    const { ctx, engine } = this
    const mid = engine.graph.edgeMidpoint(edge)
    const bx = Math.max(0, Math.min(engine.w, mid.x))
    const by = Math.max(0, Math.min(engine.h, mid.y))
    const px = bx * CELL
    const py = by * CELL
    const len = 0.6 * CELL
    // 从边界伸入地图的短线（带光晕）
    ctx.strokeStyle = this.alpha(color, 0.3)
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + dir.x * len, py + dir.y * len)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.5 + 0.4 * pulse
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + dir.x * len, py + dir.y * len)
    ctx.stroke()
    ctx.globalAlpha = 1
    // 指向行进方向的箭头
    const ax = px + dir.x * len
    const ay = py + dir.y * len
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(ax + dir.x * 8, ay + dir.y * 8)
    ctx.lineTo(ax - dir.y * 5, ay + dir.x * 5)
    ctx.lineTo(ax + dir.y * 5, ay - dir.x * 5)
    ctx.closePath()
    ctx.fill()
    // 标签
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px "Consolas", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, px + dir.x * len * 0.5, py + dir.y * len * 0.5)
  }

  // ================= 武器 / 防具 / 陷阱 / 传送门 =================
  drawStructures() {
    const { ctx, engine } = this
    for (const [key, s] of engine.structures) {
      const pos = engine.edgeMidpoint(key)
      const px = pos.x * CELL
      const py = pos.y * CELL
      if (s.kind === 'weapon') this.drawWeapon(s, px, py)
      else if (s.kind === 'armor') this.drawArmor(s, px, py)
      else if (s.kind === 'trap') this.drawTrap(s, px, py)
      else this.drawPortal(s, px, py)
    }
  }

  drawTrap(s, px, py) {
    const { ctx, engine } = this
    const def = TRAP_TYPES[s.type]
    const ready = (s.cooldown || 0) <= 0
    const t = engine.time
    ctx.strokeStyle = this.alpha(def.color, ready ? 0.5 : 0.2)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, TAU)
    ctx.stroke()
    if (s.type === 'spike') {
      // 地刺：一排尖刺
      const n = 5
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * 3.5
        const h = ready ? 8 + Math.sin(t * 4 + i) * 1.5 : 4
        ctx.fillStyle = ready ? def.color : this.alpha(def.color, 0.4)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px + ox - 2, py + 4)
        ctx.lineTo(px + ox, py - h)
        ctx.lineTo(px + ox + 2, py + 4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else {
      // 电击网：闪烁电网
      ctx.strokeStyle = ready ? def.color : this.alpha(def.color, 0.3)
      ctx.lineWidth = 1.5
      const flicker = ready ? 0.6 + 0.4 * Math.sin(t * 12) : 0.2
      ctx.globalAlpha = flicker
      for (let i = 0; i < 3; i++) {
        const y = py - 6 + i * 6
        ctx.beginPath()
        ctx.moveTo(px - 8, y)
        ctx.lineTo(px - 3, y + 3)
        ctx.lineTo(px + 1, y - 3)
        ctx.lineTo(px + 8, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  drawPortal(s, px, py) {
    const { ctx, engine } = this
    const def = PORTAL_TYPES.portal
    const t = engine.time
    const paired = !!s.pair
    // 旋转能量环
    ctx.strokeStyle = this.alpha(def.color, paired ? 0.6 : 0.25)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 11, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = this.alpha(def.color, 0.9)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, 8, t * 3, t * 3 + TAU * 0.7)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(px, py, 8, t * 3 + Math.PI, t * 3 + Math.PI + TAU * 0.7)
    ctx.stroke()
    // 中心漩涡
    const g = ctx.createRadialGradient(px, py, 0, px, py, 6)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, this.alpha(def.color, 0.1))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, TAU)
    ctx.fill()
    if (!paired) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = 'bold 8px "Consolas", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('待配对', px, py + 16)
    }
  }

  drawWeapon(s, px, py) {
    const { ctx, engine } = this
    const def = WEAPON_TYPES[s.type]
    const t = engine.time
    // 底座光环
    ctx.strokeStyle = this.alpha(def.color, 0.4)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, TAU)
    ctx.stroke()
    // 旋转扫描弧
    ctx.strokeStyle = this.alpha(def.color, 0.7)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(px, py, 9, t * 2, t * 2 + TAU * 0.6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(px, py, 9, t * 2 + Math.PI, t * 2 + Math.PI + TAU * 0.6)
    ctx.stroke()

    ctx.fillStyle = def.color
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1.5
    if (s.type === 'arrow') {
      // 箭塔：十字准星炮塔
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px - 9, py)
      ctx.lineTo(px + 9, py)
      ctx.moveTo(px, py - 9)
      ctx.lineTo(px, py + 9)
      ctx.stroke()
    } else if (s.type === 'cannon') {
      // 炮塔：重型炮管
      ctx.beginPath()
      ctx.arc(px, py, 7, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#1a1e28'
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px - 8, py)
      ctx.lineTo(px + 8, py)
      ctx.stroke()
    } else if (s.type === 'ice') {
      // 冰塔：冰晶
      ctx.beginPath()
      ctx.moveTo(px, py - 9)
      ctx.lineTo(px + 5, py + 4)
      ctx.lineTo(px, py + 1)
      ctx.lineTo(px - 5, py + 4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.arc(px, py - 2, 1.5, 0, TAU)
      ctx.fill()
    } else {
      // 毒塔：毒液泡
      ctx.beginPath()
      ctx.arc(px, py, 6.5, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * (TAU / 3)
        ctx.beginPath()
        ctx.arc(px + Math.cos(a) * 3, py + Math.sin(a) * 3, 1.2, 0, TAU)
        ctx.fill()
      }
    }
    // 升级等级标记
    if (s.level > 1) {
      ctx.fillStyle = '#ffe14d'
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.lineWidth = 1
      for (let i = 0; i < s.level; i++) {
        const a = -Math.PI / 2 + (i - (s.level - 1) / 2) * 0.5
        ctx.beginPath()
        ctx.arc(px + Math.cos(a) * 15, py + Math.sin(a) * 15, 2.2, 0, TAU)
        ctx.fill()
        ctx.stroke()
      }
    }
  }

  drawArmor(s, px, py) {
    const { ctx, engine } = this
    const def = ARMOR_TYPES[s.type]
    const t = engine.time
    ctx.strokeStyle = this.alpha(def.color, 0.4)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, py, 12, 0, TAU)
    ctx.stroke()
    if (s.type === 'slow') {
      // 减速带：旋转警示环
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(t * 0.3)
      ctx.strokeStyle = def.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, 8, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let i = 0; i < 4; i++) {
        const a = i * (TAU / 4)
        ctx.beginPath()
        ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 1.5, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    } else {
      // 路障：能量盾牌
      ctx.fillStyle = def.color
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, py - 9)
      ctx.lineTo(px + 8, py - 4)
      ctx.lineTo(px + 8, py + 4)
      ctx.lineTo(px, py + 9)
      ctx.lineTo(px - 8, py + 4)
      ctx.lineTo(px - 8, py - 4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = 'bold 8px "Consolas", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('▣', px, py + 0.5)
    }
  }

  // ================= 敌人 =================
  drawEnemies() {
    const { ctx, engine } = this
    for (const e of engine.enemies) {
      const px = e.x * CELL
      const py = e.y * CELL
      const dir = this.enemyDir(e)
      // 隐形怪：未被侦测时半透明
      const revealed = !e.stealth || engine.isStealthRevealed(e)
      if (!revealed) ctx.globalAlpha = 0.22
      // 状态光环
      if (e.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(79,195,247,0.6)'
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.arc(px, py, e.radius + 5, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
      if (e.poisonTimer > 0) {
        ctx.strokeStyle = 'rgba(102,187,106,0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, e.radius + 8, 0, TAU)
        ctx.stroke()
      }
      if (e.stunTimer > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, e.radius + 3, 0, TAU)
        ctx.stroke()
      }
      // 霓虹光晕
      ctx.strokeStyle = this.alpha(e.color, 0.35)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(px, py, e.radius + 2, 0, TAU)
      ctx.stroke()
      // 主体形状
      this.drawEnemyShape(e, px, py, dir)
      // 血条
      this.drawEnemyHp(e, px, py)
      ctx.globalAlpha = 1
    }
  }

  enemyDir(e) {
    if (e.path && e.pathIndex < e.path.length) {
      const from = e.path[e.pathIndex - 1]
      const to = e.path[e.pathIndex]
      const dx = to.x - from.x
      const dy = to.y - from.y
      const len = Math.hypot(dx, dy)
      if (len > 0) return { x: dx / len, y: dy / len }
    }
    return { x: 1, y: 0 }
  }

  drawEnemyShape(e, px, py, dir) {
    const { ctx } = this
    const r = e.radius
    const a = Math.atan2(dir.y, dir.x)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(a)
    ctx.fillStyle = e.color
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.5
    if (e.type === 'grunt') {
      // 小兵：三角
      ctx.beginPath()
      ctx.moveTo(r + 1, 0)
      ctx.lineTo(-r * 0.7, r * 0.75)
      ctx.lineTo(-r * 0.7, -r * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (e.type === 'runner') {
      // 疾行者：菱形
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(0, r * 0.7)
      ctx.lineTo(-r, 0)
      ctx.lineTo(0, -r * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (e.type === 'tank') {
      // 坦克：六边形
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * TAU + Math.PI / 6
        const x = Math.cos(ang) * r
        const y = Math.sin(ang) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.4, 0, TAU)
      ctx.fill()
    } else if (e.type === 'flyer') {
      // 飞行者：带翼菱形
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(0, r * 0.6)
      ctx.lineTo(-r, 0)
      ctx.lineTo(0, -r * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = this.alpha(e.color, 0.6)
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.4)
      ctx.lineTo(-r * 0.4, -r * 1.2)
      ctx.lineTo(-r * 0.8, -r * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(0, r * 0.4)
      ctx.lineTo(-r * 0.4, r * 1.2)
      ctx.lineTo(-r * 0.8, r * 0.3)
      ctx.closePath()
      ctx.fill()
    } else if (e.type === 'mini') {
      // 分裂体：小圆点
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.35, 0, TAU)
      ctx.fill()
    } else if (e.type === 'splitter') {
      // 分裂怪：两个相连的圆（正在分裂）
      ctx.beginPath()
      ctx.arc(-r * 0.4, 0, r * 0.7, 0, TAU)
      ctx.arc(r * 0.4, 0, r * 0.7, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.arc(-r * 0.4, 0, r * 0.25, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(r * 0.4, 0, r * 0.25, 0, TAU)
      ctx.fill()
    } else if (e.type === 'bomber') {
      // 自爆怪：圆 + 警示叉
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-r * 0.4, -r * 0.4)
      ctx.lineTo(r * 0.4, r * 0.4)
      ctx.moveTo(r * 0.4, -r * 0.4)
      ctx.lineTo(-r * 0.4, r * 0.4)
      ctx.stroke()
    } else if (e.type === 'stealth') {
      // 隐形怪：幽灵水滴
      ctx.beginPath()
      ctx.arc(0, -r * 0.3, r * 0.65, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-r * 0.65, -r * 0.1)
      ctx.lineTo(-r * 0.65, r * 0.7)
      ctx.lineTo(-r * 0.3, r * 0.4)
      ctx.lineTo(0, r * 0.7)
      ctx.lineTo(r * 0.3, r * 0.4)
      ctx.lineTo(r * 0.65, r * 0.7)
      ctx.lineTo(r * 0.65, -r * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (e.type === 'healer') {
      // 治疗怪：圆 + 十字
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillRect(-r * 0.2, -r * 0.6, r * 0.4, r * 1.2)
      ctx.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.4)
    } else {
      // Boss：八芒星
      ctx.beginPath()
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * TAU - Math.PI / 2
        const rad = i % 2 === 0 ? r : r * 0.55
        const x = Math.cos(ang) * rad
        const y = Math.sin(ang) * rad
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(0, 0, 2.5, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }

  drawEnemyHp(e, px, py) {
    const { ctx } = this
    const bw = e.radius * 2.4
    const ratio = Math.max(0, e.hp / e.maxHp)
    const bx = px - bw / 2
    const by = py - e.radius - 9
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(bx - 1, by - 1, bw + 2, 6)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(bx - 1, by - 1, bw + 2, 6)
    const color = ratio > 0.5 ? '#2ee6a8' : ratio > 0.25 ? '#ff9f43' : '#ff4d6d'
    ctx.fillStyle = color
    ctx.fillRect(bx, by, bw * ratio, 4)
  }

  // ================= 弹道 =================
  drawProjectiles() {
    const { ctx, engine } = this
    for (const p of engine.projectiles) {
      const px = p.x * CELL
      const py = p.y * CELL
      ctx.fillStyle = this.alpha(p.color, 0.3)
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, TAU)
      ctx.fill()
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(px, py, 2.5, 0, TAU)
      ctx.fill()
    }
  }

  // ================= 特效 =================
  drawEffects() {
    const { ctx, engine } = this
    for (const fx of engine.effects) {
      if (fx.type === 'boom') {
        const t = fx.t / fx.dur
        const r = (fx.radius || 12) * t
        const px = fx.x * CELL
        const py = fx.y * CELL
        ctx.strokeStyle = fx.color
        ctx.globalAlpha = 1 - t
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(px, py, r * CELL, 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = (1 - t) * 0.5
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.arc(px, py, r * CELL * 0.7, 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = 1
      } else if (fx.type === 'text') {
        const alpha = 1 - fx.t / fx.dur
        ctx.globalAlpha = alpha
        ctx.fillStyle = fx.color
        ctx.font = fx.big ? 'bold 20px "Consolas", monospace' : 'bold 12px "Consolas", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(fx.text, fx.x * CELL, (fx.y - fx.t * 0.8) * CELL)
        ctx.globalAlpha = 1
      }
    }
  }

  // ================= 悬停预览 =================
  drawHover() {
    const { ctx, engine } = this
    const mode = this.buildMode
    if (!mode) return
    if (mode.kind === 'block' || mode.kind === 'sell') {
      if (!this.hoverCell) return
      const { cx, cy } = this.hoverCell
      const px = cx * CELL
      const py = cy * CELL
      if (mode.kind === 'block') {
        const valid = engine.canPlaceBlockAt(cx, cy, mode.type)
        const color = valid ? '#2ee6a8' : '#ff4d6d'
        ctx.strokeStyle = this.alpha(color, 0.9)
        ctx.lineWidth = 2
        ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4)
        ctx.fillStyle = this.alpha(color, 0.15)
        ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)
      } else {
        // 拆除模式：优先高亮最近的设施，否则高亮路块
        const skey = engine.structureNear(this.hoverX, this.hoverY)
        if (skey) {
          const pos = engine.edgeMidpoint(skey)
          const spx = pos.x * CELL
          const spy = pos.y * CELL
          ctx.strokeStyle = '#ff5252'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(spx, spy, 15, 0, TAU)
          ctx.stroke()
          ctx.fillStyle = 'rgba(255,82,82,0.15)'
          ctx.beginPath()
          ctx.arc(spx, spy, 15, 0, TAU)
          ctx.fill()
        } else {
          ctx.strokeStyle = '#ff4d6d'
          ctx.lineWidth = 2
          ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4)
        }
      }
    } else if (mode.kind === 'weapon' || mode.kind === 'armor' || mode.kind === 'trap' || mode.kind === 'portal') {
      if (!this.hoverEdge) return
      const pos = engine.edgeMidpoint(engine.graph.edgeKey(this.hoverEdge))
      const px = pos.x * CELL
      const py = pos.y * CELL
      const def = mode.kind === 'weapon' ? WEAPON_TYPES[mode.type] : mode.kind === 'armor' ? ARMOR_TYPES[mode.type] : mode.kind === 'trap' ? TRAP_TYPES[mode.type] : PORTAL_TYPES[mode.type]
      ctx.strokeStyle = this.alpha(def.color, 0.9)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(px, py, 12, 0, TAU)
      ctx.stroke()
      if (mode.kind === 'weapon') {
        ctx.strokeStyle = this.alpha(def.color, 0.3)
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(px, py, def.range * CELL, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
    } else if (mode.kind === 'upgrade') {
      // 升级模式：高亮所有武器并显示当前等级
      for (const [key, s] of engine.structures) {
        if (s.kind !== 'weapon') continue
        const pos = engine.edgeMidpoint(key)
        const px = pos.x * CELL
        const py = pos.y * CELL
        const color = s.level >= 3 ? '#ffe14d' : '#2ee6a8'
        ctx.strokeStyle = this.alpha(color, 0.9)
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(px, py, 14, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = color
        ctx.font = 'bold 10px "Consolas", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`Lv.${s.level}`, px, py - 18)
      }
    }
  }
}
