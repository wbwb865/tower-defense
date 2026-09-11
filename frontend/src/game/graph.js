// ===== 网格图：敌人沿"格子边"移动 =====
// 节点 = 网格交点 (x, y)，x∈[0,w]，y∈[0,h]
// 边 = 相邻交点之间的线段
//   H(x,y)：水平边，连接 (x,y)-(x+1,y)
//   V(x,y)：垂直边，连接 (x,y)-(x,y+1)
// 可走边规则（"唯一来源"原则）：
//   1. 生成线 / 终点线始终可走
//   2. 外圈边界边可走，除非与路块重叠（相邻路块 → 重叠边不可走）
//   3. 非边界边：恰好与 1 个路块相邻才可走（路块产生可走边）
//   4. 与 2 个路块相邻（两路块重叠）或与 0 个相邻 → 不可走
// 寻路：逐格贪心朝终点（每格选择离终点最近的下一格）

export class GridGraph {
  constructor(w, h, spawnLines = [], exitLines = []) {
    this.w = w
    this.h = h
    this.spawnLineKeys = new Set(spawnLines.map((e) => this.edgeKey(e)))
    this.exitLineKeys = new Set(exitLines.map((e) => this.edgeKey(e)))
    // 两条生成线之间、两条终点线之间的连接边永久不可走
    // （否则敌人可在车道间切换反向绕行，造成"回头"）
    this.disabledKeys = new Set()
    this.addGapEdge(spawnLines[0], spawnLines[1])
    this.addGapEdge(exitLines[0], exitLines[1])
  }

  // 两条平行线（生成线/终点线）之间的连接边：水平线对 → 垂直边；垂直线对 → 水平边
  // 注意：必须禁用"地图边界上"的连接边（左边界 x=0 / 右边界 x=w / 上边界 y=0 / 下边界 y=h），
  // 因为敌人实际走的是边界内侧的边；地图外的边（x=-1 / y=-1）敌人永远不会经过，禁用无效
  addGapEdge(a, b) {
    if (!a || !b) return
    if (a.dir === 'h') {
      const x = a.x < 0 ? 0 : a.x
      this.disabledKeys.add(this.edgeKey({ dir: 'v', x, y: Math.min(a.y, b.y) }))
    } else {
      const y = a.y < 0 ? 0 : a.y
      this.disabledKeys.add(this.edgeKey({ dir: 'h', x: Math.min(a.x, b.x), y }))
    }
  }

  cellIndex(cx, cy) {
    return cy * this.w + cx
  }

  // 水平边 H(x,y) 相邻的格子（上方/下方）
  hCells(x, y) {
    const cells = []
    if (x < 0 || x >= this.w) return cells
    if (y > 0) cells.push({ cx: x, cy: y - 1 })
    if (y < this.h) cells.push({ cx: x, cy: y })
    return cells
  }

  // 垂直边 V(x,y) 相邻的格子（左侧/右侧）
  vCells(x, y) {
    const cells = []
    if (y < 0 || y >= this.h) return cells
    if (x > 0) cells.push({ cx: x - 1, cy: y })
    if (x < this.w) cells.push({ cx: x, cy: y })
    return cells
  }

  // 边是否位于地图外圈（墙壁）
  isBoundaryEdge(edge) {
    if (edge.dir === 'h') return (edge.y === 0 || edge.y === this.h) && edge.x >= 0 && edge.x < this.w
    return (edge.x === 0 || edge.x === this.w) && edge.y >= 0 && edge.y < this.h
  }

  isSpawnLine(edge) {
    return this.spawnLineKeys.has(this.edgeKey(edge))
  }

  isExitLine(edge) {
    return this.exitLineKeys.has(this.edgeKey(edge))
  }

  edgeExists(edge) {
    if (this.isSpawnLine(edge) || this.isExitLine(edge)) return true
    if (edge.dir === 'h') return edge.x >= 0 && edge.x < this.w && edge.y >= 0 && edge.y <= this.h
    return edge.x >= 0 && edge.x <= this.w && edge.y >= 0 && edge.y < this.h
  }

  edgeKey(edge) {
    return `${edge.dir}:${edge.x},${edge.y}`
  }

  parseEdgeKey(key) {
    const [dir, rest] = key.split(':')
    const [x, y] = rest.split(',').map(Number)
    return { dir, x, y }
  }

  edgeEnds(edge) {
    if (edge.dir === 'h') return [{ x: edge.x, y: edge.y }, { x: edge.x + 1, y: edge.y }]
    return [{ x: edge.x, y: edge.y }, { x: edge.x, y: edge.y + 1 }]
  }

  edgeMidpoint(edge) {
    if (edge.dir === 'h') return { x: edge.x + 0.5, y: edge.y }
    return { x: edge.x, y: edge.y + 0.5 }
  }

  // 边相邻的路块数量
  adjacentBlockCount(cells, edge) {
    const adj = edge.dir === 'h' ? this.hCells(edge.x, edge.y) : this.vCells(edge.x, edge.y)
    let count = 0
    for (const c of adj) {
      if (cells[this.cellIndex(c.cx, c.cy)]) count++
    }
    return count
  }

  // 边是否可走：重叠边（与边界或其他路块重叠）不可走；桥边始终可走
  edgeWalkable(cells, edge) {
    if (this.disabledKeys.has(this.edgeKey(edge))) return false
    if (this.isSpawnLine(edge) || this.isExitLine(edge)) return true
    if (this.isBridgeEdge(cells, edge)) return true
    if (this.isBoundaryEdge(edge)) {
      return this.adjacentBlockCount(cells, edge) === 0
    }
    return this.adjacentBlockCount(cells, edge) === 1
  }

  // 边的速度倍率与金币收益（由相邻路块决定）
  edgeProps(cells, edge) {
    const adj = edge.dir === 'h' ? this.hCells(edge.x, edge.y) : this.vCells(edge.x, edge.y)
    let speed = 1
    let gold = 0
    for (const c of adj) {
      const t = cells[this.cellIndex(c.cx, c.cy)]
      if (t === 'slow') speed = Math.min(speed, 0.5)
      if (t === 'gold') gold = 2
    }
    return { speed, gold }
  }

  // ---------- 桥路块：可沿边行走，也可从一条边直穿到对边（经过格心）----------
  isBridgeCell(cells, cx, cy) {
    return cells[this.cellIndex(cx, cy)] === 'bridge'
  }

  // 边是否属于某个桥格子
  isBridgeEdge(cells, edge) {
    const adj = edge.dir === 'h' ? this.hCells(edge.x, edge.y) : this.vCells(edge.x, edge.y)
    return adj.some((c) => this.isBridgeCell(cells, c.cx, c.cy))
  }

  // 桥格子的对边（直穿目标）
  oppositeBridgeEdge(cells, edge) {
    const adj = edge.dir === 'h' ? this.hCells(edge.x, edge.y) : this.vCells(edge.x, edge.y)
    for (const c of adj) {
      if (!this.isBridgeCell(cells, c.cx, c.cy)) continue
      if (edge.dir === 'h') {
        const otherY = edge.y === c.cy ? c.cy + 1 : c.cy
        return { dir: 'h', x: edge.x, y: otherY }
      }
      const otherX = edge.x === c.cx ? c.cx + 1 : c.cx
      return { dir: 'v', x: otherX, y: edge.y }
    }
    return null
  }

  // 两条对边是否属于同一个格子（桥直穿），返回格心
  // 正常路径中相邻边必共享节点；不共享节点的相邻边只可能来自桥直穿
  bridgeCenterBetween(a, b) {
    const aAdj = a.dir === 'h' ? this.hCells(a.x, a.y) : this.vCells(a.x, a.y)
    const bAdj = b.dir === 'h' ? this.hCells(b.x, b.y) : this.vCells(b.x, b.y)
    for (const ca of aAdj) {
      for (const cb of bAdj) {
        if (ca.cx === cb.cx && ca.cy === cb.cy) {
          return { x: ca.cx + 0.5, y: ca.cy + 0.5 }
        }
      }
    }
    return null
  }

  // 半格坐标点是否为桥格心（x、y 均为半整数）
  isCenterPoint(p) {
    return !Number.isInteger(p.x) && !Number.isInteger(p.y)
  }

  // 半格坐标中点 → 所在边
  edgeContainingMidpoint(p) {
    if (Number.isInteger(p.y)) return { dir: 'h', x: Math.floor(p.x), y: p.y }
    return { dir: 'v', x: p.x, y: Math.floor(p.y) }
  }

  // 节点上所有可走的边
  incidentEdges(cells, node) {
    const { x, y } = node
    const candidates = [
      { dir: 'h', x: x - 1, y },
      { dir: 'h', x, y },
      { dir: 'v', x, y: y - 1 },
      { dir: 'v', x, y }
    ]
    return candidates.filter((e) => this.edgeExists(e) && this.edgeWalkable(cells, e))
  }

  // 边的另一个端点
  otherEndpoint(edge, node) {
    const ends = this.edgeEnds(edge)
    for (const p of ends) {
      if (p.x !== node.x || p.y !== node.y) return p
    }
    return null
  }

  nodeKey(node) {
    return `${node.x},${node.y}`
  }

  centerKey(center) {
    return `c:${center.x},${center.y}`
  }

  closerEndpoint(edge, target) {
    const ends = this.edgeEnds(edge)
    const d0 = Math.hypot(ends[0].x - target.x, ends[0].y - target.y)
    const d1 = Math.hypot(ends[1].x - target.x, ends[1].y - target.y)
    return d0 <= d1 ? ends[0] : ends[1]
  }

  // 逐格贪心寻路（带回溯）：从 startEdge 的中点出发，每格选择离 target 最近的下一格
  // 遇死路时回溯尝试次优分支（桥边会形成回路，纯贪心可能卡死）；返回边数组；无通路返回 null
  // startNode 可选：指定起始节点（用于重寻路时保持敌人前进方向，避免回头）
  greedyPath(cells, startEdge, target, startNode) {
    const path = [startEdge]
    const node = startNode || this.closerEndpoint(startEdge, target)
    const visited = new Set([this.nodeKey(node)])
    const guard = { n: 0 }
    if (this.greedyDfs(cells, startEdge, node, target, visited, path, guard)) return path
    return null
  }

  greedyDfs(cells, fromEdge, node, target, visited, path, guard) {
    if (++guard.n > 2000) return false
    if (this.isExitLine(fromEdge)) return true
    const cands = this.greedyCandidates(cells, fromEdge, node, target, visited)
    for (const c of cands) {
      path.push(c.edge)
      if (c.viaCenter) visited.add(this.centerKey(c.center))
      visited.add(this.nodeKey(c.node))
      if (this.greedyDfs(cells, c.edge, c.node, target, visited, path, guard)) return true
      if (c.viaCenter) visited.delete(this.centerKey(c.center))
      visited.delete(this.nodeKey(c.node))
      path.pop()
    }
    return false
  }

  // 从当前边/节点出发的所有候选（按离 target 距离升序；桥直穿优先）
  greedyCandidates(cells, fromEdge, node, target, visited) {
    const cands = []
    // 桥直穿候选：从桥的一条边直穿到对边（经过格心），可继续从对边任一端点出发
    if (this.isBridgeEdge(cells, fromEdge)) {
      const opp = this.oppositeBridgeEdge(cells, fromEdge)
      const center = opp ? this.bridgeCenterBetween(fromEdge, opp) : null
      if (opp && center && this.edgeWalkable(cells, opp) && !visited.has(this.centerKey(center))) {
        for (const end of this.edgeEnds(opp)) {
          const d = Math.hypot(end.x - target.x, end.y - target.y)
          cands.push({ edge: opp, node: end, viaCenter: true, center, d })
        }
      }
    }
    for (const e of this.incidentEdges(cells, node)) {
      if (this.edgeKey(e) === this.edgeKey(fromEdge)) continue
      const other = this.otherEndpoint(e, node)
      if (!other) continue
      if (visited.has(this.nodeKey(other))) continue
      const d = Math.hypot(other.x - target.x, other.y - target.y)
      cands.push({ edge: e, node: other, viaCenter: false, d })
    }
    cands.sort((a, b) => a.d - b.d)
    return cands
  }

  // 边路径 → 敌人移动点路径（首尾为边中点，中间为共享交点；桥直穿经过格心）
  edgePathToPoints(edgePath) {
    if (!edgePath || edgePath.length === 0) return null
    const points = [this.edgeMidpoint(edgePath[0])]
    for (let i = 0; i < edgePath.length - 1; i++) {
      const shared = this.sharedNode(edgePath[i], edgePath[i + 1])
      if (shared) {
        points.push(shared)
      } else {
        // 桥直穿：两条对边之间经过格心
        const center = this.bridgeCenterBetween(edgePath[i], edgePath[i + 1])
        if (center) points.push(center)
      }
    }
    points.push(this.edgeMidpoint(edgePath[edgePath.length - 1]))
    return points
  }

  sharedNode(a, b) {
    const aEnds = this.edgeEnds(a)
    const bEnds = this.edgeEnds(b)
    for (const p of aEnds) {
      for (const q of bEnds) {
        if (p.x === q.x && p.y === q.y) return p
      }
    }
    return null
  }

  edgeBetweenPoints(a, b) {
    // 桥格心：返回格心所在桥边的对应边
    if (this.isCenterPoint(a) || this.isCenterPoint(b)) {
      const other = this.isCenterPoint(a) ? b : a
      return this.edgeContainingMidpoint(other)
    }
    if (a.x === b.x) return { dir: 'v', x: a.x, y: Math.floor(Math.min(a.y, b.y)) }
    return { dir: 'h', x: Math.floor(Math.min(a.x, b.x)), y: a.y }
  }
}
