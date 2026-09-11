// 蛇形路径场景：敌人沿蛇形路径行走，前方放块是否导致回头
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 5000, lives: 20
  })
}

// 构建蛇形路径：迫使上车道敌人走"之"字形
// 上车道敌人默认：左边界上行 → 上边界右行 → 右边界下行 → 出口
// 用路块制造走廊，让敌人来回折返
function buildSerpentine(eng) {
  const cells = [
    // 第一段：上边界 y=0 处放墙 (x=4..13)，迫使敌人在 x=4 处下绕
    [4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],
    // 第二段：y=2 处放墙 (x=1..9)，迫使敌人下到 y=2 后向左折返
    [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],
    // 第三段：y=4 处放墙 (x=4..13)，迫使敌人再向右
    [4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4],
  ]
  for (const [cx, cy] of cells) {
    const r = eng.placeBlock(cx, cy, 'path')
    if (!r.ok) console.log('  放块失败', cx, cy, r.msg)
  }
}

// 检查路径是否有回头段（x 减小）
function pathHasBacktrack(pts, fromIdx) {
  for (let i = fromIdx; i < pts.length - 1; i++) {
    if (pts[i + 1].x < pts[i].x - 0.01) {
      return { i, from: pts[i], to: pts[i + 1] }
    }
  }
  return null
}

{
  const eng = makeEngine()
  buildSerpentine(eng)
  console.log('hasValidPath:', eng.hasValidPath())
  // 打印上车道路径
  const targets = eng.laneTargets()
  const path = eng.graph.greedyPath(eng.cells, eng.spawnLines[0], targets[0])
  if (path) {
    const pts = eng.graph.edgePathToPoints(path)
    console.log('上车道路径点数:', pts.length)
    console.log('路径:', pts.map((p) => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(' '))
  } else {
    console.log('上车道无路径!')
  }

  // 出生上车道敌人，推进到蛇形路径中段
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  // 推进到 x 在 6~8 之间（第一段墙附近）
  guard = 0
  while (guard++ < 60000 && !(e.x >= 6 && e.x <= 8)) eng.update(1 / 60)
  console.log('敌人位置:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey, 'pathIdx:', e.pathIndex)

  // 在前方放块（敌人前方 1-2 格）
  const aheadX = Math.floor(e.x) + 1
  console.log('尝试在前方放块:', aheadX, Math.floor(e.y))
  const r = eng.placeBlock(aheadX, Math.floor(e.y), 'path')
  console.log('放块:', r.ok ? '成功' : r.msg)
  const afterPts = e.path.map((p) => [p.x, p.y])
  const at = pathHasBacktrack(afterPts, e.pathIndex)
  console.log('放块后剩余路径是否有回头段:', at ? JSON.stringify(at) : '无')
  if (at) {
    console.log('新路径:', JSON.stringify(afterPts.slice(Math.max(0, e.pathIndex - 2))))
  }
}
