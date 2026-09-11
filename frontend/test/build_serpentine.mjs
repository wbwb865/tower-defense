// 调试：逐步构建蛇形路径，打印每步路径
import { GameEngine } from '../src/game/engine.js'

function makeEngine() {
  return new GameEngine({
    width: 14, height: 12,
    spawn: { x: 0, y: 6 }, exit: { x: 14, y: 6 },
    startGold: 50000, lives: 20
  })
}

function printPath(eng, laneIdx) {
  const targets = eng.laneTargets()
  const path = eng.graph.greedyPath(eng.cells, eng.spawnLines[laneIdx], targets[laneIdx])
  if (!path) return `车道${laneIdx} 无路径`
  const pts = eng.graph.edgePathToPoints(path)
  return `车道${laneIdx}(${pts.length}): ` + pts.map((p) => `(${p.x},${p.y})`).join(' ')
}

const eng = makeEngine()
const plan = [
  // 行0 天花板
  [1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],
  // 列12 右墙
  [12,1],[12,2],[12,3],[12,4],[12,5],[12,6],
  // 行6 中墙（从右往左）
  [11,6],[10,6],[9,6],[8,6],[7,6],[6,6],[5,6],[4,6],[3,6],[2,6],
  // 列2 左墙（向下）
  [2,7],[2,8],[2,9],[2,10],[2,11],
  // 行11 底墙
  [3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11]
]
for (const [bx, by] of plan) {
  const r = eng.placeBlock(bx, by, 'path')
  if (!r.ok) {
    console.log(`铺块失败 (${bx},${by}): ${r.msg}`)
    console.log('  当前路径:', printPath(eng, 0))
    break
  }
  console.log(`铺块 (${bx},${by}) 成功 | ${printPath(eng, 0)}`)
}
console.log('车道1:', printPath(eng, 1))
