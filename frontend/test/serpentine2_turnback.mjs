// 蛇形路径上的回头检测：玩家铺好路后，在敌人前方放块
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 50000, lives: 20
  })
}

// 铺蛇形路径：行0天花板、列12右墙、行6中墙、列2左墙、行11底墙
function buildSerpentine(eng) {
  const blocks = []
  for (let x = 1; x <= 12; x++) blocks.push([x, 0])       // 行0
  for (let y = 1; y <= 6; y++) blocks.push([12, y])       // 列12
  for (let x = 11; x >= 2; x--) blocks.push([x, 6])       // 行6
  for (let y = 7; y <= 11; y++) blocks.push([2, y])       // 列2
  for (let x = 3; x <= 13; x++) blocks.push([x, 11])      // 行11
  for (const [bx, by] of blocks) {
    const r = eng.placeBlock(bx, by, 'path')
    if (!r.ok) {
      console.log(`铺块失败 (${bx},${by}): ${r.msg}`)
      return false
    }
  }
  return true
}

// 打印一条生成线的路径
function printPath(eng, laneIdx) {
  const targets = eng.laneTargets()
  const path = eng.graph.greedyPath(eng.cells, eng.spawnLines[laneIdx], targets[laneIdx])
  if (!path) {
    console.log(`车道${laneIdx} 无路径!`)
    return null
  }
  const pts = eng.graph.edgePathToPoints(path)
  console.log(`车道${laneIdx} 路径(${pts.length}点):`, pts.map((p) => `(${p.x},${p.y})`).join(' '))
  return pts
}

// 检查放块后敌人是否回头（沿路径方向坐标倒退）
function checkTurnBack(eng, e, blockCell, axis, dir, label) {
  const before = axis === 'x' ? e.x : e.y
  const r = eng.placeBlock(blockCell[0], blockCell[1], 'path')
  if (!r.ok) return null
  let minProg = before
  let maxProg = before
  for (let i = 0; i < 90; i++) {
    eng.update(1 / 60)
    if (e.dead || e.reachedExit) break
    const p = axis === 'x' ? e.x : e.y
    minProg = Math.min(minProg, p)
    maxProg = Math.max(maxProg, p)
  }
  const cur = axis === 'x' ? e.x : e.y
  const turned = dir === 1 ? cur < before - 0.1 : cur > before + 0.1
  if (turned) {
    console.log(`>>> 回头! ${label} 敌人pos(${e.x.toFixed(2)},${e.y.toFixed(2)}) edge=${e.currentEdgeKey} 放块(${blockCell[0]},${blockCell[1]}) before=${before.toFixed(2)} after=${cur.toFixed(2)}`)
    return true
  }
  return false
}

const eng = makeEngine()
if (!buildSerpentine(eng)) {
  console.log('铺路失败，退出')
  process.exit(1)
}
console.log('hasValidPath:', eng.hasValidPath())
printPath(eng, 0)
printPath(eng, 1)

let found = 0

// 车道0：沿蛇形路径前进，扫描各位置，前方放块
{
  eng.startWave()
  let guard = 0
  while (guard++ < 3000 && eng.enemies.length === 0) eng.update(1 / 60)
  const e = eng.enemies.find((en) => en.currentEdgeKey === 'h:-1,6') || eng.enemies[0]
  // 沿路径推进，每 0.5 格尝试前方放块
  for (let step = 0; step < 200 && !e.reachedExit && !e.dead; step++) {
    // 记录当前位置和方向
    const curEdge = e.currentEdgeKey
    const beforeX = e.x
    const beforeY = e.y
    // 推进 0.5 格
    for (let i = 0; i < 30; i++) {
      eng.update(1 / 60)
      if (e.reachedExit || e.dead) break
    }
    const movedX = e.x - beforeX
    const movedY = e.y - beforeY
    // 尝试在当前位置前方放块（沿移动方向）
    const axis = Math.abs(movedX) >= Math.abs(movedY) ? 'x' : 'y'
    const dir = axis === 'x' ? Math.sign(movedX) : Math.sign(movedY)
    if (dir === 0) continue
    const cx = Math.round(e.x)
    const cy = Math.round(e.y)
    // 前方 1-2 格
    for (let ahead = 1; ahead <= 2; ahead++) {
      const bx = axis === 'x' ? cx + dir * ahead : cx
      const by = axis === 'y' ? cy + dir * ahead : cy
      if (bx < 0 || bx >= 14 || by < 0 || by >= 12) continue
      if (checkTurnBack(eng, e, [bx, by], axis, dir, `车道0 step=${step} pos(${e.x.toFixed(1)},${e.y.toFixed(1)})`)) found++
    }
  }
}

console.log(found === 0 ? '未发现回头场景' : `发现 ${found} 个回头场景`)
