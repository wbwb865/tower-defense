// 详细检查：放块前后敌人路径对比，找"往回走"的路径段
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 5000, lives: 20
  })
}

function pathHasBacktrack(pts, fromIdx) {
  // 检查从 fromIdx 起的路径点是否有 x 明显减小的段（左→右地图）
  for (let i = fromIdx; i < pts.length - 1; i++) {
    if (pts[i + 1].x < pts[i].x - 0.01) {
      return { i, from: pts[i], to: pts[i + 1] }
    }
  }
  return null
}

// 场景A：上车道敌人沿上边界走到 x≈7，前方放块 (8,0)
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  guard = 0
  while (guard++ < 60000 && !(e.y < 0.5 && e.x >= 7)) eng.update(1 / 60)
  console.log('=== 场景A: 上边界 x≈7 放块(8,0) ===')
  console.log('放块前 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey)
  const beforePts = e.path.map((p) => [p.x, p.y])
  const bt = pathHasBacktrack(beforePts, e.pathIndex)
  console.log('放块前剩余路径是否有回头段:', bt ? JSON.stringify(bt) : '无')
  const r = eng.placeBlock(8, 0, 'path')
  console.log('放块:', r.ok ? '成功' : r.msg)
  const afterPts = e.path.map((p) => [p.x, p.y])
  const at = pathHasBacktrack(afterPts, e.pathIndex)
  console.log('放块后剩余路径是否有回头段:', at ? JSON.stringify(at) : '无')
  console.log('放块后 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey, 'pathIdx:', e.pathIndex)
  if (at) {
    console.log('新路径:', JSON.stringify(afterPts.slice(e.pathIndex)))
  }
}

// 场景B：上车道敌人沿左边界上行时，前方放块 (0,4)
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  guard = 0
  while (guard++ < 60000 && !(e.x < 0.5 && e.y <= 4)) eng.update(1 / 60)
  console.log('=== 场景B: 左边界上行 y≈4 放块(0,3) ===')
  console.log('放块前 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey)
  const beforePtsB = e.path.map((p) => [p.x, p.y])
  console.log('放块前剩余路径是否有回头段:', pathHasBacktrack(beforePtsB, e.pathIndex) ? '有' : '无')
  const rB = eng.placeBlock(0, 3, 'path')
  console.log('放块:', rB.ok ? '成功' : rB.msg)
  const afterPtsB = e.path.map((p) => [p.x, p.y])
  const atB = pathHasBacktrack(afterPtsB, e.pathIndex)
  console.log('放块后剩余路径是否有回头段:', atB ? JSON.stringify(atB) : '无')
  console.log('放块后 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey)
  if (atB) {
    console.log('新路径:', JSON.stringify(afterPtsB.slice(e.pathIndex)))
  }
}

// 场景C：上车道敌人沿右边界下行时，前方放块 (13,4)
{
  const eng = makeEngine()
  eng.startWave()
  let guard = 0
  while (guard++ < 2000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((x) => x.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  guard = 0
  while (guard++ < 60000 && !(e.x > 13.5 && e.y >= 4)) eng.update(1 / 60)
  console.log('=== 场景C: 右边界下行 y≈4 放块(13,4) ===')
  console.log('放块前 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey)
  const beforePtsC = e.path.map((p) => [p.x, p.y])
  console.log('放块前剩余路径是否有回头段:', pathHasBacktrack(beforePtsC, e.pathIndex) ? '有' : '无')
  const rC = eng.placeBlock(13, 4, 'path')
  console.log('放块:', rC.ok ? '成功' : rC.msg)
  const afterPtsC = e.path.map((p) => [p.x, p.y])
  const atC = pathHasBacktrack(afterPtsC, e.pathIndex)
  console.log('放块后剩余路径是否有回头段:', atC ? JSON.stringify(atC) : '无')
  console.log('放块后 pos:', e.x.toFixed(2), e.y.toFixed(2), 'edge:', e.currentEdgeKey)
  if (atC) {
    console.log('新路径:', JSON.stringify(afterPtsC.slice(e.pathIndex)))
  }
}
